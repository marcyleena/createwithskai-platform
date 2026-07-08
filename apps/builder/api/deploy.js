// Vercel serverless function -- creates a GitHub repo, commits the
// generated files to it using the user's own GitHub token, then triggers a
// Vercel deployment of the same files using the user's own Vercel token.
// Runs server-side so we don't depend on the Vercel API's CORS support.
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

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${githubToken}`, Accept: "application/vnd.github+json" },
    });
    if (!userRes.ok) {
      throw new Error("Could not verify your GitHub account -- try reconnecting GitHub.");
    }
    const githubUser = await userRes.json();

    const createRepoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        private: false,
        auto_init: false,
        description: "Generated with AI Influencer Launchpad App Builder",
      }),
    });
    if (!createRepoRes.ok) {
      const errBody = await createRepoRes.json().catch(() => ({}));
      throw new Error(errBody.message || "Could not create the GitHub repository.");
    }
    const repo = await createRepoRes.json();

    for (const file of files) {
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const contentBase64 = Buffer.from(file.content, "utf-8").toString("base64");
      const putRes = await fetch(
        `https://api.github.com/repos/${githubUser.login}/${repoName}/contents/${encodedPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: `Add ${file.path}`, content: contentBase64 }),
        }
      );
      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        throw new Error(`Could not commit ${file.path}: ${errBody.message || putRes.status}`);
      }
    }

    const hasPackageJson = files.some((f) => f.path === "package.json");
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repoName,
        files: files.map((f) => ({ file: f.path, data: f.content })),
        projectSettings: { framework: hasPackageJson ? "vite" : null },
        target: "production",
      }),
    });
    const deployment = await deployRes.json();
    if (!deployRes.ok) {
      throw new Error(deployment.error?.message || "Could not trigger the Vercel deployment.");
    }

    res.status(200).json({
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      deploymentUrl: `https://${deployment.url}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Deployment failed." });
  }
}
