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

const REQUIRED_REACT_FILES = ["src/App.jsx", "src/main.jsx", "package.json", "index.html", "vite.config.js"];

const DEFAULT_APP_JSX = `function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1>App failed to generate</h1>
      <p>Something went wrong producing this app's main component. Go back to the Builder and try regenerating.</p>
    </div>
  );
}
export default App;
`;

const DEFAULT_MAIN_JSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const DEFAULT_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const DEFAULT_INDEX_CSS = `:root {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
`;

function buildDefaultPackageJson(stack) {
  const dependencies = { react: "^18.3.1", "react-dom": "^18.3.1" };
  if (stack === "react-supabase") dependencies["@supabase/supabase-js"] = "^2.45.4";
  return JSON.stringify(
    {
      name: "app",
      private: true,
      version: "0.0.1",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies,
      devDependencies: { "@vitejs/plugin-react": "^4.3.1", vite: "^5.4.2" },
    },
    null,
    2
  );
}

function looksLikeValidPackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Boolean(deps.vite && deps.react && deps["react-dom"] && pkg.scripts && pkg.scripts.build);
  } catch {
    return false;
  }
}

function looksLikeValidViteConfig(content) {
  return /defineConfig/.test(content) && /@vitejs\/plugin-react/.test(content);
}

function isCssPath(path) {
  return path.toLowerCase().endsWith(".css");
}

// Generated output occasionally omits a required file, puts one at an
// unexpected path, or produces a malformed package.json/vite.config.js --
// deploying that guarantees a Vercel build failure days after the fact
// instead of surfacing the problem now. This repairs what it safely can
// right before the files are committed, and logs every repair so it's
// visible in the function's logs.
//
// The specific bug this was written for: src/main.jsx always imports
// "./index.css", which resolves to exactly src/index.css -- if the CSS file
// Claude generated ended up at a different path (e.g. a bare "index.css" at
// the repo root), the live preview still renders fine (previewBuilder.ts
// matches any *.css file regardless of path), but Vercel's build fails with
// "Could not resolve './index.css' from 'src/main.jsx'".
function validateAndRepairFiles(files, stack) {
  if (stack === "static-html") return files; // single self-contained index.html, nothing to validate

  const byPath = new Map(files.map((f) => [f.path, f]));
  const warnings = [];

  if (!byPath.has("src/index.css")) {
    const anyCss = files.find((f) => isCssPath(f.path));
    if (anyCss) {
      warnings.push(`src/index.css missing -- using the styles found at "${anyCss.path}" instead.`);
      byPath.set("src/index.css", { path: "src/index.css", content: anyCss.content });
    } else {
      warnings.push("No CSS file found anywhere in the generated output -- adding an empty src/index.css.");
      byPath.set("src/index.css", { path: "src/index.css", content: DEFAULT_INDEX_CSS });
    }
  }

  for (const path of REQUIRED_REACT_FILES) {
    if (byPath.has(path)) continue;
    warnings.push(`${path} missing from the generated output -- generating a default.`);
    const content =
      path === "src/App.jsx"
        ? DEFAULT_APP_JSX
        : path === "src/main.jsx"
          ? DEFAULT_MAIN_JSX
          : path === "index.html"
            ? DEFAULT_INDEX_HTML
            : path === "vite.config.js"
              ? DEFAULT_VITE_CONFIG
              : buildDefaultPackageJson(stack);
    byPath.set(path, { path, content });
  }

  const pkg = byPath.get("package.json");
  if (pkg && !looksLikeValidPackageJson(pkg.content)) {
    warnings.push("package.json is missing required Vite/React dependencies or a build script -- replacing it with a default.");
    byPath.set("package.json", { path: "package.json", content: buildDefaultPackageJson(stack) });
  }

  const viteConfig = byPath.get("vite.config.js");
  if (viteConfig && !looksLikeValidViteConfig(viteConfig.content)) {
    warnings.push("vite.config.js doesn't look like a valid Vite + React config -- replacing it with a default.");
    byPath.set("vite.config.js", { path: "vite.config.js", content: DEFAULT_VITE_CONFIG });
  }

  if (warnings.length > 0) {
    console.warn(
      `[api/deploy] repaired the generated file set before committing:\n${warnings.map((w) => `- ${w}`).join("\n")}`
    );
  }

  return Array.from(byPath.values());
}

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

  const { githubToken, vercelToken, repoName, files: rawFiles, existingRepoFullName, stack } = req.body || {};
  if (!githubToken || !vercelToken || !repoName || !Array.isArray(rawFiles) || rawFiles.length === 0) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const files = validateAndRepairFiles(rawFiles, stack);

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

    // 2. Get the repository to commit to -- either the one this build was
    // already deployed to (redeploying), or a brand new one.
    let owner = githubUser.login;
    let repo;
    let repoUrl;
    let repoFullName;

    if (existingRepoFullName) {
      // The client's `repoName` is a freshly re-slugified value with a
      // random suffix (see slugifyRepoName in src/lib/naming.ts) -- it's
      // different on every call and would never match the repo actually
      // created before, so the authoritative name comes from
      // existingRepoFullName instead.
      stage = "looking up the existing GitHub repository";
      [owner, repo] = existingRepoFullName.split("/");
      const repoRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: GITHUB_HEADERS(githubToken),
      });
      if (!repoRes.ok) {
        throw new Error(`Could not find the existing repository ${existingRepoFullName} (${repoRes.status}).`);
      }
      const existingRepo = await repoRes.json();
      repoUrl = existingRepo.html_url;
      repoFullName = existingRepo.full_name;
    } else {
      stage = "creating the GitHub repository";
      const createRepoRes = await fetchWithTimeout("https://api.github.com/user/repos", {
        method: "POST",
        headers: { ...GITHUB_HEADERS(githubToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repoName,
          private: false,
          auto_init: false,
          description: "Generated with AI Business Launchpad App Builder",
        }),
      });
      if (!createRepoRes.ok) {
        const errBody = await createRepoRes.json().catch(() => ({}));
        throw new Error(errBody.message || `Could not create the GitHub repository (${createRepoRes.status}).`);
      }
      const createdRepo = await createRepoRes.json();
      repo = createdRepo.name;
      repoUrl = createdRepo.html_url;
      repoFullName = createdRepo.full_name;
    }

    // 3. Commit each file -- every entry in `files` (post-repair above),
    // component files, config files, and stylesheets alike; nothing here
    // filters by extension or path. Logged explicitly so a missing file in
    // the deployed repo can be traced back to what was actually sent,
    // rather than assumed to be this loop dropping something silently.
    // Sequential on purpose: each PUT to the Contents API creates a new
    // commit on top of the branch's current HEAD, so firing these in
    // parallel risks two commits racing for the same parent and one landing
    // with a 409 conflict.
    stage = "committing files to the repository";
    console.log(
      `[api/deploy] committing ${files.length} file(s): ${files.map((f) => f.path).join(", ")}`
    );
    for (const file of files) {
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
      const contentBase64 = Buffer.from(file.content, "utf-8").toString("base64");

      // Updating an existing file requires its current blob sha -- the
      // Contents API rejects a PUT with none. A 404 here just means this
      // path is new since the last deploy, which is fine without one.
      let sha;
      if (existingRepoFullName) {
        const existingRes = await fetchWithTimeout(contentsUrl, { headers: GITHUB_HEADERS(githubToken) });
        if (existingRes.ok) {
          const existing = await existingRes.json();
          sha = existing.sha;
        }
      }

      const putRes = await fetchWithTimeout(contentsUrl, {
        method: "PUT",
        headers: { ...GITHUB_HEADERS(githubToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sha ? `Update ${file.path}` : `Add ${file.path}`,
          content: contentBase64,
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        throw new Error(`Could not commit ${file.path}: ${errBody.message || putRes.status}`);
      }
    }

    // 4. Trigger a Vercel deployment directly from the same files. Using
    // `repo` (not the client's repoName) as the project name means a
    // redeploy lands on the exact same Vercel project -- and therefore the
    // same *.vercel.app domain -- as the original deployment.
    stage = "triggering the Vercel deployment";
    const hasPackageJson = files.some((f) => f.path === "package.json");
    const deployRes = await fetchWithTimeout("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repo,
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
    const productionAlias = await getProductionAlias(deployment.id, vercelToken, repo);

    res.status(200).json({
      repoUrl,
      repoFullName,
      deploymentUrl: `https://${productionAlias}`,
      previewUrl: `https://${deployment.url}`,
    });
  } catch (err) {
    res.status(500).json({ error: `Deployment failed while ${stage}: ${err.message || "unknown error"}` });
  }
}
