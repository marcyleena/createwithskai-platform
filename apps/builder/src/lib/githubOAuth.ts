const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
const STATE_KEY = "builder_github_oauth_state";

export function isGithubOAuthConfigured(): boolean {
  return Boolean(GITHUB_CLIENT_ID);
}

// Redirects the whole page to GitHub's consent screen. GitHub redirects back
// to the api/github/callback.js serverless function, which exchanges the
// code for a token server-side and redirects here again with the token in
// the URL hash (see consumeGithubOAuthResult).
export function startGithubOAuth(): void {
  if (!GITHUB_CLIENT_ID) return;
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const redirectUri = `${window.location.origin}/api/github/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  window.location.href = url.toString();
}

export type GithubOAuthResult = { token: string } | { error: string };

// Call once on app mount. Reads the token (or error) the callback function
// left in the URL hash, verifies the state we stashed before redirecting,
// and always scrubs the hash from the visible URL afterward.
export function consumeGithubOAuthResult(): GithubOAuthResult | null {
  if (!window.location.hash.includes("github_token") && !window.location.hash.includes("github_error")) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("github_token");
  const state = params.get("state");
  const error = params.get("github_error");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (error) return { error };
  if (!token) return { error: "GitHub didn't return an access token." };
  if (!state || state !== expectedState) {
    return { error: "GitHub sign-in couldn't be verified -- please try connecting again." };
  }
  return { token };
}
