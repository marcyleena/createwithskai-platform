import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import { useAuth } from "@createwithskai/auth";

// `completed === null` means "not yet known" -- distinct from `false`, so
// callers can tell "still loading" apart from "definitely not onboarded" even
// before `loading` flips.
export function useOnboarding() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompleted(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCompleted(Boolean((data as { onboarding_completed?: boolean } | null)?.onboarding_completed));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const markCompleted = useCallback(async () => {
    if (!user) return;
    await supabase.from("users").update({ onboarding_completed: true }).eq("id", user.id);
    setCompleted(true);
  }, [user]);

  return { completed, loading, markCompleted };
}
