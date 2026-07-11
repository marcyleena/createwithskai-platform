import { useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";

interface ToolActivity {
  hasUsedCoach: boolean;
  hasBrandProfile: boolean;
  hasUsedHq: boolean;
  hasUsedBuilder: boolean;
  loading: boolean;
}

const INITIAL: ToolActivity = {
  hasUsedCoach: false,
  hasBrandProfile: false,
  hasUsedHq: false,
  hasUsedBuilder: false,
  loading: true,
};

async function hasAnyRow(table: string, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

// Drives the dashboard's contextual "next step" prompt -- a lightweight
// funnel signal (Coach -> brand profile -> Creator HQ -> App Builder), not a
// full activity feed, so it only checks for row existence, not content.
export function useToolActivity(userId?: string): ToolActivity {
  const [state, setState] = useState<ToolActivity>(INITIAL);

  useEffect(() => {
    if (!userId) {
      setState({ ...INITIAL, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const [coach, brand, competitors, calendar, builds] = await Promise.all([
        hasAnyRow("coach_conversations", userId),
        hasAnyRow("brand_profiles", userId),
        hasAnyRow("hq_competitors", userId),
        hasAnyRow("hq_content_calendar", userId),
        hasAnyRow("app_builds", userId),
      ]);
      if (cancelled) return;
      setState({
        hasUsedCoach: coach,
        hasBrandProfile: brand,
        hasUsedHq: competitors || calendar,
        hasUsedBuilder: builds,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
