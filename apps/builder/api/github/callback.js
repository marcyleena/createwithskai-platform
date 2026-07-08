// Vercel serverless function -- the redirect_uri for the GitHub OAuth App.
// GitHub sends the user here with a `code` after they approve access; this
// function exchanges that code for an access token using the client secret
// (never exposed to the browser), then redirects back to the app with the
// token in the URL hash so the client can store it in user_credentials.
export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const appOrigin = `https://${req.headers.host}`;

  function redirectWithHash(hash) {
    res.writeHead(302, { Location: `${appOrigin}/#${hash}` });
    res.end();
  }

  if (error) {
    redirectWithHash(`github_error=${encodeURIComponent(String(error))}`);
    return;
  }
  if (!code) {
    redirectWithHash(`github_error=${encodeURIComponent("Missing authorization code from GitHub.")}`);
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await tokenRes.json();

    if (!data.access_token) {
      redirectWithHash(
        `github_error=${encodeURIComponent(data.error_description || "GitHub didn't return an access token.")}`
      );
      return;
    }

    redirectWithHash(
      `github_token=${encodeURIComponent(data.access_token)}&state=${encodeURIComponent(String(state || ""))}`
    );
  } catch (err) {
    redirectWithHash(`github_error=${encodeURIComponent(err.message || "GitHub sign-in failed.")}`);
  }
}
