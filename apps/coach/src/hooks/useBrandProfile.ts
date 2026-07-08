import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import type { BrandProfile } from "@createwithskai/types";

export function useBrandProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setProfile((data as BrandProfile) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
