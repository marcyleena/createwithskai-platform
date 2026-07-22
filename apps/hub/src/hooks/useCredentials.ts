import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";
import type { UserCredential } from "@createwithskai/types";

interface CredentialSpec {
  provider: string;
  credentialType?: string;
}

// Fetches several (provider, credential_type) rows from user_credentials in
// one round trip instead of one useCredential() call per provider -- see
// GettingStartedChecklist, which used to fire three separate queries.
export function useCredentials(specs: CredentialSpec[]) {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Record<string, UserCredential | null>>({});
  const [loading, setLoading] = useState(true);
  const key = specs.map((s) => `${s.provider}:${s.credentialType ?? "api_key"}`).join(",");

  const refresh = useCallback(async () => {
    if (!user || specs.length === 0) {
      setCredentials({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_credentials")
      .select("*")
      .eq("user_id", user.id)
      .in(
        "provider",
        specs.map((s) => s.provider)
      );
    const rows = (data as UserCredential[]) ?? [];
    const map: Record<string, UserCredential | null> = {};
    for (const spec of specs) {
      const credentialType = spec.credentialType ?? "api_key";
      map[spec.provider] =
        rows.find((r) => r.provider === spec.provider && r.credential_type === credentialType) ?? null;
    }
    setCredentials(map);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { credentials, loading, refresh };
}
