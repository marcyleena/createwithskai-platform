import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";

interface UseCredentialOptions {
  provider: string;
  credentialType: string;
  /** Key inside the jsonb `value` column that holds the actual token/secret. */
  valueKey: string;
}

// Generic read/write for a single (provider, credential_type) row in
// user_credentials -- used for the GitHub OAuth token and the pasted-in
// Vercel API token, alongside the Anthropic key handled by useApiKey.
export function useCredential({ provider, credentialType, valueKey }: UseCredentialOptions) {
  const { user } = useAuth();
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setValue(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_credentials")
      .select("value")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("credential_type", credentialType)
      .maybeSingle();
    const row = data?.value as Record<string, unknown> | undefined;
    setValue((row?.[valueKey] as string) || null);
    setLoading(false);
  }, [user, provider, credentialType, valueKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (newValue: string) => {
      if (!user) return;
      await supabase
        .from("user_credentials")
        .upsert(
          { user_id: user.id, provider, credential_type: credentialType, value: { [valueKey]: newValue } },
          { onConflict: "user_id,provider,credential_type" }
        );
      setValue(newValue);
    },
    [user, provider, credentialType, valueKey]
  );

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("user_credentials")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("credential_type", credentialType);
    setValue(null);
  }, [user, provider, credentialType]);

  return { value, loading, save, clear, refresh };
}
