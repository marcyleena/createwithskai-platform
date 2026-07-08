import type { GeneratedFile } from "./types";

export interface DeployResult {
  repoUrl: string;
  repoFullName: string;
  deploymentUrl: string;
}

interface DeployParams {
  githubToken: string;
  vercelToken: string;
  repoName: string;
  files: GeneratedFile[];
}

// Calls the api/deploy.js serverless function, which does the GitHub repo
// creation + commit and the Vercel deployment server-side (avoids relying on
// browser CORS support for the Vercel API, and keeps both API calls in one
// place instead of duplicating fetch logic client-side).
export async function deployApp({ githubToken, vercelToken, repoName, files }: DeployParams): Promise<DeployResult> {
  const response = await fetch("/api/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ githubToken, vercelToken, repoName, files }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Deployment failed.");
  }
  return data as DeployResult;
}
