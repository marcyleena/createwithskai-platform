import { useState } from "react";
import { Button, Input } from "@createwithskai/ui";
import { isGithubOAuthConfigured, startGithubOAuth } from "../lib/githubOAuth";
import type { DeployResult } from "../lib/deployClient";

interface DeploySectionProps {
  githubToken: string | null;
  vercelToken: string | null;
  onSaveVercelToken: (token: string) => Promise<void>;
  onDeploy: () => void;
  deploying: boolean;
  deployError: string | null;
  result: DeployResult | null;
}

export function DeploySection({
  githubToken,
  vercelToken,
  onSaveVercelToken,
  onDeploy,
  deploying,
  deployError,
  result,
}: DeploySectionProps) {
  const [vercelInput, setVercelInput] = useState("");
  const [savingVercel, setSavingVercel] = useState(false);

  async function handleSaveVercel(e: React.FormEvent) {
    e.preventDefault();
    if (!vercelInput.trim()) return;
    setSavingVercel(true);
    await onSaveVercelToken(vercelInput.trim());
    setVercelInput("");
    setSavingVercel(false);
  }

  return (
    <div className="rounded-xl border border-taupe/40 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-espresso">Deploy</h3>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-taupe/30 p-3">
          <div>
            <p className="text-sm font-medium text-espresso">1. Connect GitHub</p>
            <p className="text-xs text-espresso/60">
              {githubToken ? "Connected." : "Creates the repo your app's code lives in."}
            </p>
          </div>
          {githubToken ? (
            <span className="flex-none rounded-full bg-accent-pink/15 px-3 py-1 text-xs font-medium text-accent-pink">
              Connected
            </span>
          ) : isGithubOAuthConfigured() ? (
            <Button variant="dark" onClick={startGithubOAuth} className="flex-none px-4 py-2 text-sm">
              Connect GitHub
            </Button>
          ) : (
            <span className="flex-none text-xs text-espresso/40">Not configured yet</span>
          )}
        </div>

        <div className="rounded-lg border border-taupe/30 p-3">
          <p className="text-sm font-medium text-espresso">2. Connect Vercel</p>
          {vercelToken ? (
            <p className="mt-1 text-xs text-espresso/60">Connected.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-espresso/60">
                Paste an API token from{" "}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-pink underline"
                >
                  vercel.com/account/tokens
                </a>
                .
              </p>
              <form onSubmit={handleSaveVercel} className="mt-2 flex gap-2">
                <Input
                  type="password"
                  value={vercelInput}
                  onChange={(e) => setVercelInput(e.target.value)}
                  placeholder="Vercel API token"
                  className="text-sm"
                />
                <Button
                  type="submit"
                  variant="dark"
                  disabled={!vercelInput.trim() || savingVercel}
                  className="flex-none px-4 py-2 text-sm"
                >
                  Save
                </Button>
              </form>
            </>
          )}
        </div>

        <Button
          variant="primary"
          onClick={onDeploy}
          disabled={!githubToken || !vercelToken || deploying}
          className="!bg-accent-pink justify-center py-3 !text-white hover:!bg-accent-pink/90"
        >
          {deploying ? "Deploying..." : "Deploy"}
        </Button>

        {deployError && <p className="text-sm text-red-600">{deployError}</p>}

        {result && (
          <div className="rounded-lg border border-taupe/30 bg-cream p-3 text-sm">
            <p className="font-medium text-espresso">Deployed.</p>
            <p className="mt-1 break-all">
              <a
                href={result.deploymentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent-pink underline"
              >
                {result.deploymentUrl}
              </a>
            </p>
            <p className="mt-1 text-xs text-espresso/60">
              Source:{" "}
              <a href={result.repoUrl} target="_blank" rel="noreferrer" className="underline">
                {result.repoUrl}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
