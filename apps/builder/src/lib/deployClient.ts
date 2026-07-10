import type { GeneratedFile } from "./types";

export interface DeployResult {
  repoUrl: string;
  repoFullName: string;
  // Clean production alias, e.g. https://project-name.vercel.app -- what the
  // success screen links to.
  deploymentUrl: string;
  // Raw per-deployment URL, e.g. https://project-name-<hash>-<account>.vercel.app
  // -- kept for storage/debugging but not shown as the primary link.
  previewUrl: string;
}

interface DeployParams {
  githubToken: string;
  vercelToken: string;
  repoName: string;
  files: GeneratedFile[];
}

// Slightly longer than api/deploy.js's own maxDuration (60s, see vercel.json)
// so a real server-side timeout gets a chance to return its own error
// response before the client gives up first.
const CLIENT_TIMEOUT_MS = 70000;

// Calls the api/deploy.js serverless function, which does the GitHub repo
// creation + commit and the Vercel deployment server-side (avoids relying on
// browser CORS support for the Vercel API, and keeps both API calls in one
// place instead of duplicating fetch logic client-side).
export async function deployApp({ githubToken, vercelToken, repoName, files }: DeployParams): Promise<DeployResult> {
  let response: Response;
  try {
    response = await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubToken, vercelToken, repoName, files }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (err) {
    // A thrown fetch (as opposed to a resolved response with a non-2xx
    // status) means the request never completed a round trip at all --
    // the network dropped, the function crashed before responding, or it
    // ran past its own timeout and the platform killed the connection.
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("Deployment is taking too long and timed out. Try again, or try a simpler app.");
    }
    throw new Error("Could not reach the deployment service. Check your connection and try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Deployment failed (${response.status}).`);
  }
  return data as DeployResult;
}
