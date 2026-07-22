import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@createwithskai/auth";
import { Button } from "@createwithskai/ui";
import { useCredentials } from "../../hooks/useCredentials";
import { useGithubConnected } from "../../hooks/useGithubConnected";
import { CheckBadge } from "../CheckBadge";

const CREDENTIAL_SPECS = [
  { provider: "anthropic" },
  { provider: "apify" },
  { provider: "vercel", credentialType: "api_token" },
];

const DISMISS_KEY_PREFIX = "hub-getting-started-dismissed:";
const FADE_DELAY_MS = 3000;
const FADE_DURATION_MS = 300;

function ChecklistCard({ done, doneLabel, children }: { done: boolean; doneLabel: string; children: ReactNode }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
        done ? "border-taupe/20 bg-taupe/10" : "border-taupe/40 bg-white"
      }`}
    >
      {done ? (
        <>
          <span className="text-sm font-medium text-espresso/50">{doneLabel}</span>
          <CheckBadge />
        </>
      ) : (
        children
      )}
    </div>
  );
}

// Shown at the top of the dashboard for returning users until all three
// setup steps are done. Once complete it collapses to a single congratulatory
// line, fades out, and is dismissed forever via localStorage (per user, since
// it's keyed off the signed-in user's id).
export function GettingStartedChecklist() {
  const { user } = useAuth();
  const { credentials, loading: credentialsLoading } = useCredentials(CREDENTIAL_SPECS);
  const { connected: githubConnected, loading: githubLoading, connect } = useGithubConnected();
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until localStorage says otherwise, to avoid a flash
  const [fading, setFading] = useState(false);

  const dismissKey = user ? `${DISMISS_KEY_PREFIX}${user.id}` : null;

  useEffect(() => {
    if (!dismissKey) return;
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const loading = credentialsLoading || githubLoading;

  const steps = [
    { done: Boolean(credentials.anthropic) },
    { done: Boolean(credentials.apify) },
    { done: githubConnected },
    { done: Boolean(credentials.vercel) },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const allComplete = completedCount === steps.length;

  useEffect(() => {
    if (!allComplete || dismissed || loading || !dismissKey) return;
    setFading(false);
    const fadeTimer = setTimeout(() => setFading(true), FADE_DELAY_MS);
    const hideTimer = setTimeout(() => {
      localStorage.setItem(dismissKey, "1");
      setDismissed(true);
    }, FADE_DELAY_MS + FADE_DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [allComplete, dismissed, loading, dismissKey]);

  async function handleGithubConnect() {
    setGithubBusy(true);
    setGithubError(null);
    const { error } = await connect("github");
    if (error) setGithubError(error);
    setGithubBusy(false);
  }

  if (loading || dismissed) return null;

  if (allComplete) {
    return (
      <p
        className={`mb-10 text-sm font-medium text-espresso/70 transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        You are all set. All tools are connected.
      </p>
    );
  }

  return (
    <section className="mb-10 rounded-2xl border border-taupe/40 bg-white/60 p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-bold text-espresso">Getting started</span>
          <span className="rounded-full bg-accent-pink/15 px-2.5 py-0.5 text-xs font-medium text-accent-pink">
            {completedCount} of {steps.length} complete
          </span>
        </span>
        <span className={`text-espresso/50 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expanded && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ChecklistCard done={steps[0].done} doneLabel="Anthropic API key">
            <a
              href="#profile-connections"
              className="text-sm font-medium text-espresso underline decoration-accent-pink underline-offset-4 hover:text-accent-pink"
            >
              Add your Anthropic API key
            </a>
          </ChecklistCard>
          <ChecklistCard done={steps[1].done} doneLabel="Apify API key">
            <a
              href="#profile-connections"
              className="text-sm font-medium text-espresso underline decoration-accent-pink underline-offset-4 hover:text-accent-pink"
            >
              Add your Apify API key
            </a>
          </ChecklistCard>
          <ChecklistCard done={steps[2].done} doneLabel="GitHub">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-medium text-espresso">Connect GitHub</span>
              <Button
                variant="dark"
                onClick={handleGithubConnect}
                disabled={githubBusy}
                className="!px-3 !py-1.5 !text-sm"
              >
                {githubBusy ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </ChecklistCard>
          <ChecklistCard done={steps[3].done} doneLabel="Vercel">
            <a
              href="#profile-connections"
              className="text-sm font-medium text-espresso underline decoration-accent-pink underline-offset-4 hover:text-accent-pink"
            >
              Connect Vercel
            </a>
          </ChecklistCard>
        </div>
      )}
      {githubError && <p className="mt-3 text-sm text-red-600">{githubError}</p>}
    </section>
  );
}
