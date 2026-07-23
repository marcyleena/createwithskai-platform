import { useState } from "react";
import { Button } from "@createwithskai/ui";
import { useGithubConnected } from "../hooks/useGithubConnected";
import { CONNECTION_GUIDES } from "../lib/connectionGuides";
import { GuideCard } from "./GuideCard";

export function GithubGuideCard() {
  const guide = CONNECTION_GUIDES.github;
  const { connected, loading, connect, disconnect } = useGithubConnected();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    const { error: connectError } = await connect("github");
    if (connectError) setError(connectError);
    setBusy(false);
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    const { error: disconnectError } = await disconnect("github");
    if (disconnectError) setError(disconnectError);
    setBusy(false);
  }

  return (
    <GuideCard done={connected} loading={loading} guide={guide}>
      {connected ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-espresso/50">Connected.</p>
          <Button variant="dark" onClick={handleDisconnect} disabled={busy} className="!px-3 !py-1.5 !text-sm">
            {busy ? "Working…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <Button variant="dark" onClick={handleConnect} disabled={busy}>
          {busy ? "Connecting…" : "Connect GitHub"}
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </GuideCard>
  );
}
