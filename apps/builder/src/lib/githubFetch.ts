import type { GeneratedFile, Stack } from "./types";

// Mirrors the file lists in systemPrompts.ts's stackInstructions() -- used
// only as a fallback when a build's Supabase record has no files stored at
// all (should be rare: every generation and change request persists them,
// see App.tsx), so we at least know which paths to look for in the repo.
const EXPECTED_FILES_BY_STACK: Record<Stack, string[]> = {
  "static-html": ["index.html"],
  "react-localstorage": [
    "src/App.jsx",
    "src/main.jsx",
    "index.html",
    "vite.config.js",
    "package.json",
    "src/index.css",
  ],
  "react-supabase": [
    "src/App.jsx",
    "src/main.jsx",
    "index.html",
    "vite.config.js",
    "package.json",
    "src/index.css",
    "SUPABASE_SETUP.md",
  ],
};

interface GithubContentsResponse {
  content: string;
  encoding: string;
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

// Fetches a deployed build's files straight from its GitHub repo when
// Supabase has none stored. GitHub's REST API allows authenticated CORS
// reads, so this runs directly from the browser -- unlike the write path in
// api/deploy.js, which needs a serverless proxy because GitHub's write
// endpoints (and Vercel's API entirely) don't support browser CORS.
export async function fetchRepoFiles(
  githubToken: string,
  repoFullName: string,
  stack: Stack
): Promise<GeneratedFile[]> {
  const paths = EXPECTED_FILES_BY_STACK[stack] ?? [];
  const results = await Promise.all(
    paths.map(async (path): Promise<GeneratedFile | null> => {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodedPath}`, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!response.ok) return null; // 404 for a file this stack didn't end up generating
      const data = (await response.json()) as GithubContentsResponse;
      const content = data.encoding === "base64" ? decodeBase64Utf8(data.content) : data.content;
      return { path, content };
    })
  );
  return results.filter((f): f is GeneratedFile => f !== null);
}
