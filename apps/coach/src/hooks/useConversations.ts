import { useCallback, useEffect, useState } from "react";
import { supabase } from "@createwithskai/api";
import type { CoachConversation } from "@createwithskai/types";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const MAX_CONVERSATIONS = 15;

function byRecency(a: CoachConversation, b: CoachConversation) {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("coach_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(MAX_CONVERSATIONS);
    setConversations((data as CoachConversation[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createConversation = useCallback(async (): Promise<CoachConversation | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("coach_conversations")
      .insert({ user_id: userId, title: null, messages: [] })
      .select()
      .single();
    if (error || !data) return null;
    const created = data as CoachConversation;
    setConversations((prev) => [created, ...prev].slice(0, MAX_CONVERSATIONS));
    return created;
  }, [userId]);

  const saveMessages = useCallback(
    async (id: string, messages: ChatMessage[], title?: string) => {
      const patch: Record<string, unknown> = { messages };
      if (title) patch.title = title;
      const { data } = await supabase
        .from("coach_conversations")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (!data) return;
      const updated = data as CoachConversation;
      setConversations((prev) => {
        const next = prev.some((c) => c.id === id)
          ? prev.map((c) => (c.id === id ? updated : c))
          : [updated, ...prev];
        return next.sort(byRecency).slice(0, MAX_CONVERSATIONS);
      });
    },
    []
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    await supabase.from("coach_conversations").update({ title }).eq("id", id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("coach_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    conversations,
    loading,
    refresh,
    createConversation,
    saveMessages,
    renameConversation,
    deleteConversation,
  };
}
