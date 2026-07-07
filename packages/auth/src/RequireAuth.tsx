import { useEffect, type ReactNode } from "react";
import { getHubOrigin } from "@createwithskai/api";
import { useAuth } from "./AuthContext";

// Hub's own login page is a same-origin React Router page (see apps/hub),
// but coach/hq/builder have no login UI of their own — every unauthenticated
// visitor there is bounced to the hub's login with `next` so hub can send
// them back to whatever they were trying to reach.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(window.location.href);
      window.location.href = `${getHubOrigin()}/login?next=${next}`;
    }
  }, [loading, user]);

  if (loading || !user) return null;

  return <>{children}</>;
}
