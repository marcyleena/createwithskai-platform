import { useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";

const CREDENTIAL_FETCH_ERROR =
  "Couldn't load your Anthropic API key from your account -- check your internet connection and refresh the page.";

// Same storage contract as the hub dashboard's ApiKeyField: one row per
// (user, provider, credential_type), value = { api_key: string }.
export function useApiKey() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setApiKey(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchApiKey() {
      try {
        const { data, error: fetchError } = await supabase
          .from("user_credentials")
          .select("value")
          .eq("user_id", user!.id)
          .eq("provider", "anthropic")
          .eq("credential_type", "api_key")
          .maybeSingle();
        if (cancelled) return;
        if (fetchError) {
          setApiKey(null);
          setError(CREDENTIAL_FETCH_ERROR);
          setLoading(false);
          return;
        }
        const value = data?.value as { api_key?: string } | undefined;
        setApiKey(value?.api_key || null);
        setLoading(false);
      } catch {
        // supabase-js resolves query errors into `{ error }` above rather
        // than rejecting, but a real network failure (offline, DNS, blocked
        // request) can still reject the call outright -- without this catch
        // that failure would go unhandled and `loading` would stay true
        // forever, leaving the app stuck on a blank screen.
        if (cancelled) return;
        setApiKey(null);
        setError(CREDENTIAL_FETCH_ERROR);
        setLoading(false);
      }
    }
    fetchApiKey();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { apiKey, loading, error };
}
