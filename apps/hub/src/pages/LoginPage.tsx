import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@createwithskai/auth";
import { ROOT_DOMAIN, supabase } from "@createwithskai/api";
import { Button, Card, Input } from "@createwithskai/ui";

// Only ever redirect back into our own domain (or localhost in dev) -- never
// follow an arbitrary `next` value, since that would be an open redirect.
function resolveNext(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    const isTrusted =
      url.hostname === ROOT_DOMAIN ||
      url.hostname.endsWith(`.${ROOT_DOMAIN}`) ||
      url.hostname === "localhost";
    return isTrusted ? url.href : null;
  } catch {
    return null;
  }
}

export function LoginPage() {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = resolveNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForgotForm, setShowForgotForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Already signed in (e.g. arrived here from a stale link, or the shared
  // session was already set by another app) -- bounce straight through.
  useEffect(() => {
    if (!authLoading && user) {
      if (next) window.location.href = next;
      else navigate("/", { replace: true });
    }
  }, [authLoading, user, next, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === "sign-in" ? await signIn(email, password) : await signUp(email, password);

    setLoading(false);
    if (authError) {
      setError(authError);
      return;
    }
    if (next) window.location.href = next;
    else navigate("/");
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    const { error: resetErrorResult } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://createwithskai.cloud/reset-password",
    });
    setResetLoading(false);
    if (resetErrorResult) {
      setResetError(resetErrorResult.message);
      return;
    }
    setResetSent(true);
  }

  if (!authLoading && user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 py-12">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-espresso">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        {mode === "sign-in" && !showForgotForm && (
          <button
            type="button"
            className="mt-3 text-sm text-taupe underline"
            onClick={() => setShowForgotForm(true)}
          >
            Forgot your password?
          </button>
        )}

        {mode === "sign-in" && showForgotForm && (
          <div className="mt-3 rounded-lg border border-taupe/30 bg-white/60 p-4">
            {resetSent ? (
              <p className="text-sm text-espresso/70">Check your email for a link to reset your password.</p>
            ) : (
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
                <p className="text-sm text-espresso/70">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <Input
                  type="email"
                  placeholder="Email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                {resetError && <p className="text-sm text-red-600">{resetError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={resetLoading}>
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForgotForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        <button
          className="mt-4 text-sm text-espresso/60 underline"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </Card>

      <Link to="/privacy" className="text-sm text-taupe hover:text-accent-pink">
        Privacy Policy
      </Link>
    </div>
  );
}
