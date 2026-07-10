// Vercel serverless function -- creates a GitHub repo, commits the
// generated files to it using the user's own GitHub token, then triggers a
// Vercel deployment of the same files using the user's own Vercel token.
// Runs entirely server-side: the client only ever calls this one endpoint
// (see src/lib/deployClient.ts) and never talks to api.github.com or
// api.vercel.com directly -- both would refuse a browser origin, and even
// if they didn't, it would mean shipping the user's tokens into client JS.
const REQUEST_TIMEOUT_MS = 20000; // fail a single stuck call well before the function's own maxDuration

// Stay under vercel.json's maxDuration (60s) with headroom to still build and
// send a response after polling ends.
const FUNCTION_BUDGET_MS = 55000;
const POLL_INTERVAL_MS = 2000;

// A stalled upstream call (GitHub or Vercel) would otherwise hang until the
// platform kills the whole function -- which drops the connection without a
// real HTTP response and surfaces to the browser as a bare "Failed to fetch"
// instead of a readable error. Timing out each call individually turns that
// into a normal, attributable error response instead.
async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error(`Request to ${new URL(url).hostname} timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  }
}

const GITHUB_HEADERS = (githubToken) => ({
  Authorization: `token ${githubToken}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

// Polls the deployment until Vercel finishes building it (or errors/cancels),
// or until budgetMs runs out -- whichever comes first. The production alias
// isn't reliably assigned until the deployment reaches a terminal state, but
// we can't wait indefinitely inside a single serverless invocation.
async function pollDeploymentUntilDone(deploymentId, vercelToken, budgetMs) {
  const deadline = Date.now() + budgetMs;
  let deployment = null;
  while (Date.now() < deadline) {
    const res = await fetchWithTimeout(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (res.ok) {
      deployment = await res.json();
      if (["READY", "ERROR", "CANCELED"].includes(deployment.readyState)) {
        return deployment;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return deployment; // still building (or never fetched) -- caller falls back gracefully
}

// The clean production alias (project-name.vercel.app) is only visible via a
// separate aliases lookup, not on the deployment object itself. If it isn't
// assigned yet (or the lookup fails), fall back to the deterministic default
// Vercel assigns a project on its first deployment -- same format the caller
// is trying to surface anyway.
async function getProductionAlias(deploymentId, vercelToken, repoName) {
  const fallback = `${repoName}.vercel.app`;
  try {
    const res = await fetchWithTimeout(`https://api.vercel.com/v2/deployments/${deploymentId}/aliases`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (!res.ok) return fallback;
    const body = await res.json();
    const aliases = (body.aliases || []).map((a) => a.alias).filter((a) => a.endsWith(".vercel.app"));
    if (aliases.length === 0) return fallback;
    return aliases.includes(fallback) ? fallback : aliases.sort((a, b) => a.length - b.length)[0];
  } catch {
    return fallback;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const { githubToken, vercelToken, repoName, files } = req.body || {};
  if (!githubToken || !vercelToken || !repoName || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const startedAt = Date.now();
  let stage = "verifying your GitHub account";
  try {
    // 1. Verify the GitHub token and find out who it belongs to.
    const userRes = await fetchWithTimeout("https://api.github.com/user", {
      headers: GITHUB_HEADERS(githubToken),
    });
    if (!userRes.ok) {
      throw new Error(`GitHub rejected your token (${userRes.status}) -- try reconnecting GitHub.`);
    }
    const githubUser = await userRes.json();

    // 2. Create the repository.
    stage = "creating the GitHub repository";
    const createRepoRes = await fetchWithTimeout("https://api.github.com/user/repos", {
      method: "POST",
      headers: { ...GITHUB_HEADERS(githubToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repoName,
        private: false,
        auto_init: false,
        description: "Generated with AI Influencer Launchpad App Builder",
      }),
    });
    if (!createRepoRes.ok) {
      const errBody = await createRepoRes.json().catch(() => ({}));
      throw new Error(errBody.message || `Could not create the GitHub repository (${createRepoRes.status}).`);
    }
    const repo = await createRepoRes.json();

    // 3. Commit each file. Sequential on purpose: each PUT to the Contents
    // API creates a new commit on top of the branch's current HEAD, so
    // firing these in parallel risks two commits racing for the same parent
    // and one landing with a 409 conflict.
    stage = "committing files to the repository";
    for (const file of files) {
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const contentBase64 = Buffer.from(file.content, "utf-8").toString("base64");
      const putRes = await fetchWithTimeout(
        `https://api.github.com/repos/${githubUser.login}/${repoName}/contents/${encodedPath}`,
        {
          method: "PUT",
          headers: { ...GITHUB_HEADERS(githubToken), "Content-Type": "application/json" },
          body: JSON.stringify({ message: `Add ${file.path}`, content: contentBase64 }),
        }
      );
      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        throw new Error(`Could not commit ${file.path}: ${errBody.message || putRes.status}`);
      }
    }

    // 4. Trigger a Vercel deployment directly from the same files.
    stage = "triggering the Vercel deployment";
    const hasPackageJson = files.some((f) => f.path === "package.json");
    const deployRes = await fetchWithTimeout("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repoName,
        files: files.map((f) => ({ file: f.path, data: f.content })),
        projectSettings: { framework: hasPackageJson ? "vite" : null },
        target: "production",
      }),
    });
    const deployment = await deployRes.json().catch(() => ({}));
    if (!deployRes.ok) {
      throw new Error(deployment.error?.message || `Vercel rejected the deployment (${deployRes.status}).`);
    }

    // 5. Wait for the build to finish (best-effort, budget permitting) so the
    // production alias has a chance to be assigned, then look it up. The raw
    // per-deployment URL always works as a fallback and gets stored alongside
    // it, but the success screen should show the clean project alias instead.
    stage = "waiting for the deployment to finish";
    const pollBudget = FUNCTION_BUDGET_MS - (Date.now() - startedAt) - 5000;
    const finalDeployment =
      pollBudget > 0 ? await pollDeploymentUntilDone(deployment.id, vercelToken, pollBudget) : null;
    if (finalDeployment?.readyState === "ERROR") {
      throw new Error("The Vercel deployment failed during the build. Check the Vercel dashboard for details.");
    }

    stage = "looking up the production alias";
    const productionAlias = await getProductionAlias(deployment.id, vercelToken, repoName);

    res.status(200).json({
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      deploymentUrl: `https://${productionAlias}`,
      previewUrl: `https://${deployment.url}`,
    });
  } catch (err) {
    res.status(500).json({ error: `Deployment failed while ${stage}: ${err.message || "unknown error"}` });
  }
}
