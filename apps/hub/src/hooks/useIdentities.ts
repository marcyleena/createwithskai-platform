import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import type { UserIdentity } from "@supabase/supabase-js";

export function useIdentities() {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUserIdentities();
    if (!error && data) setIdentities(data.identities);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async (provider: "github") => {
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const disconnect = useCallback(
    async (provider: string) => {
      const identity = identities.find((i) => i.provider === provider);
      if (!identity) return { error: "Not connected" };
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [identities, refresh]
  );

  return { identities, loading, connect, disconnect, refresh };
}
