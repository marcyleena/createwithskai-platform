import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "../lib/profileExtraction";

function storageKey(userId: string): string {
  return `skai-coach-user-profile:${userId}`;
}

// Persists the lightweight, regex-extracted conversation profile across
// sessions so returning users get "REMEMBER THIS ABOUT THE USER" context
// without needing another API call or a Supabase round trip.
export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(userId));
      setProfile(raw ? (JSON.parse(raw) as UserProfile) : null);
    } catch {
      setProfile(null);
    }
  }, [userId]);

  const mergeProfile = useCallback(
    (update: UserProfile | null) => {
      if (!userId || !update) return;
      setProfile((prev) => {
        const merged: UserProfile = { ...prev, ...update };
        try {
          localStorage.setItem(storageKey(userId), JSON.stringify(merged));
        } catch {
          // localStorage unavailable -- profile just won't persist across reloads.
        }
        return merged;
      });
    },
    [userId]
  );

  return { profile, mergeProfile };
}
