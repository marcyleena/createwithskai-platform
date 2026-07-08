import { useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";

// Same storage contract as the hub dashboard's ApiKeyField: one row per
// (user, provider, credential_type), value = { api_key: string }.
export function useApiKey() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApiKey(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("user_credentials")
      .select("value")
      .eq("user_id", user.id)
      .eq("provider", "anthropic")
      .eq("credential_type", "api_key")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.value as { api_key?: string } | undefined;
        setApiKey(value?.api_key || null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { apiKey, loading };
}
