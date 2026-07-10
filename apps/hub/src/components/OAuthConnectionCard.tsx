import type { ReactNode } from "react";
import { Button } from "@createwithskai/ui";

interface OAuthConnectionCardProps {
  icon: ReactNode;
  name: string;
  description: string;
  connected: boolean;
  comingSoon?: boolean;
  busy?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function OAuthConnectionCard({
  icon,
  name,
  description,
  connected,
  comingSoon,
  busy,
  onConnect,
  onDisconnect,
}: OAuthConnectionCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-taupe/40 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-espresso text-cream">
          {icon}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-espresso">{name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                connected ? "bg-accent-pink/15 text-accent-pink" : "bg-taupe/30 text-espresso/60"
              }`}
            >
              {connected ? "Connected" : comingSoon ? "Coming soon" : "Not connected"}
            </span>
          </div>
          <p className="text-sm text-espresso/60">{description}</p>
        </div>
      </div>
      <Button
        variant="dark"
        disabled={comingSoon || busy}
        onClick={connected ? onDisconnect : onConnect}
        className="self-start sm:self-auto"
      >
        {busy ? "Working…" : connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
