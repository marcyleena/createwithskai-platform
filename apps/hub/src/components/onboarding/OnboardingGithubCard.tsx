import { useState } from "react";
import { Button, Card } from "@createwithskai/ui";
import { useGithubConnected } from "../../hooks/useGithubConnected";
import { CheckBadge } from "../CheckBadge";

export function OnboardingGithubCard() {
  const { connected, loading, connect } = useGithubConnected();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    const { error: connectError } = await connect("github");
    if (connectError) setError(connectError);
    setBusy(false);
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-medium text-espresso">GitHub</p>
        {!loading && connected && <CheckBadge />}
      </div>
      <p className="mb-3 text-sm text-espresso/60">
        Needed so the App Builder can push your generated code to your own repository.
      </p>
      {connected ? (
        <p className="text-sm text-espresso/50">Connected -- you can manage this anytime from your dashboard.</p>
      ) : (
        <Button variant="dark" onClick={handleConnect} disabled={busy}>
          {busy ? "Connecting…" : "Connect GitHub"}
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
