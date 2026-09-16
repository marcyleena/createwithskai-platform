import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import type { AppBuild } from "@createwithskai/types";
import type { BuildConfig } from "../lib/types";

const MAX_BUILDS = 10;

function byRecency(a: AppBuild, b: AppBuild) {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export function useBuilds(userId: string | undefined) {
  const [builds, setBuilds] = useState<AppBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBuilds([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("app_builds")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(MAX_BUILDS);
    const page = (data as AppBuild[]) ?? [];
    setBuilds(page);
    setHasMore(page.length === MAX_BUILDS);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!userId || builds.length === 0) return;
    setLoadingMore(true);
    const oldest = builds[builds.length - 1].updated_at;
    const { data } = await supabase
      .from("app_builds")
      .select("*")
      .eq("user_id", userId)
      .lt("updated_at", oldest)
      .order("updated_at", { ascending: false })
      .limit(MAX_BUILDS);
    const page = (data as AppBuild[]) ?? [];
    setBuilds((prev) => [...prev, ...page]);
    setHasMore(page.length === MAX_BUILDS);
    setLoadingMore(false);
  }, [userId, builds]);

  const createBuild = useCallback(
    async (name: string, platform: string, config: BuildConfig): Promise<AppBuild | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("app_builds")
        .insert({ user_id: userId, name, platform, status: "draft", config })
        .select()
        .single();
      if (error || !data) {
        console.error("[useBuilds] createBuild failed:", error);
        return null;
      }
      const created = data as AppBuild;
      setBuilds((prev) => [created, ...prev]);
      return created;
    },
    [userId]
  );

  const updateBuild = useCallback(
    async (
      id: string,
      patch: { status?: AppBuild["status"]; name?: string; config?: BuildConfig }
    ): Promise<{ build: AppBuild | null; error: string | null }> => {
      // Previously ignored `error` entirely -- a failed update (e.g. the DB's
      // status check constraint rejecting a value, an RLS mismatch, a
      // network blip) silently returned null with no indication anything
      // went wrong, and the local `builds` array kept whatever it had
      // before. Since BuilderSidebar and handleSelectBuild both read from
      // that array, a deploy whose Supabase write failed this way looked
      // like it succeeded (deployApp itself did) but reverted to
      // pre-deployment state the moment you navigated away and back.
      // Returning the error message (not just logging it) lets callers like
      // App.tsx's handleDeploy show the real reason in the UI, not a guess.
      const { data, error } = await supabase.from("app_builds").update(patch).eq("id", id).select().single();
      if (error || !data) {
        console.error(`[useBuilds] updateBuild failed for build ${id}:`, error);
        return { build: null, error: error?.message ?? "Unknown error saving to Supabase." };
      }
      const updated = data as AppBuild;
      setBuilds((prev) =>
        prev.some((b) => b.id === id)
          ? prev.map((b) => (b.id === id ? updated : b)).sort(byRecency)
          : [updated, ...prev].sort(byRecency)
      );
      return { build: updated, error: null };
    },
    []
  );

  const deleteBuild = useCallback(async (id: string) => {
    await supabase.from("app_builds").delete().eq("id", id);
    setBuilds((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { builds, loading, loadingMore, hasMore, loadMore, refresh, createBuild, updateBuild, deleteBuild };
}
