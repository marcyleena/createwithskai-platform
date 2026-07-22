import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";
import type { UserCredential } from "@createwithskai/types";

export function useCredential(provider: string, credentialType = "api_key") {
  const { user } = useAuth();
  const [credential, setCredential] = useState<UserCredential | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCredential(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("credential_type", credentialType)
      .maybeSingle();
    setCredential((data as UserCredential) ?? null);
    setLoading(false);
  }, [user, provider, credentialType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (value: Record<string, unknown>) => {
      if (!user) return { error: "Not signed in" };
      const previous = credential;
      const now = new Date().toISOString();
      setCredential({
        id: previous?.id ?? "optimistic",
        user_id: user.id,
        provider,
        credential_type: credentialType,
        value,
        created_at: previous?.created_at ?? now,
        updated_at: now,
      });
      const { data, error } = await supabase
        .from("user_credentials")
        .upsert(
          { user_id: user.id, provider, credential_type: credentialType, value },
          { onConflict: "user_id,provider,credential_type" }
        )
        .select()
        .single();
      if (error) {
        setCredential(previous);
        return { error: error.message };
      }
      setCredential(data as UserCredential);
      return { error: null };
    },
    [user, provider, credentialType, credential]
  );

  const remove = useCallback(async () => {
    if (!credential) return;
    const previous = credential;
    setCredential(null);
    const { error } = await supabase.from("user_credentials").delete().eq("id", previous.id);
    if (error) setCredential(previous);
  }, [credential]);

  return { credential, loading, save, remove, refresh };
}
