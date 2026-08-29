import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@createwithskai/auth";
import type { BrandProfile, CoachConversation } from "@createwithskai/types";
import { MessageBubble } from "./MessageBubble";
import { QuickPrompts } from "./QuickPrompts";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { ChatInput } from "./ChatInput";
import { streamChatResponse, friendlyErrorMessage } from "../lib/anthropic";
import { buildSystemPrompt } from "../lib/systemPrompt";
import { extractProfileFromConversation } from "../lib/profileExtraction";
import { readFileAsAttachment, type PendingAttachment } from "../lib/fileReading";
import { useUserProfile } from "../hooks/useUserProfile";
import type { ChatMessage } from "../hooks/useConversations";

interface ChatViewProps {
  apiKey: string;
  conversation: CoachConversation | null;
  brandProfile: BrandProfile | null;
  onCreateConversation: () => Promise<CoachConversation | null>;
  onConversationPersisted: (conv: CoachConversation) => void;
  onSaveMessages: (id: string, messages: ChatMessage[], title?: string) => void;
}

function deriveTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 60)}...` : clean;
}

// How close to the bottom (in px) counts as "at the bottom" for auto-scroll purposes.
const NEAR_BOTTOM_THRESHOLD = 100;

// Scroll positions survive a ChatView remount (e.g. switching to the Product
// Builder tab and back) by living outside the component instance, keyed by
// conversation id so switching conversations doesn't leak one's scroll
// position into another's.
const NEW_CONVERSATION_SCROLL_KEY = "__new__";
const savedScrollPositions = new Map<string, number>();

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD;
}

export function ChatView({
  apiKey,
  conversation,
  brandProfile,
  onCreateConversation,
  onConversationPersisted,
  onSaveMessages,
}: ChatViewProps) {
  const { user } = useAuth();
  const { profile: userProfile, mergeProfile } = useUserProfile(user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages ?? []);
  const [conversationId, setConversationId] = useState<string | null>(conversation?.id ?? null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Whether the user was at (or near) the bottom of the chat as of the last
  // scroll event -- used to decide whether a new message should auto-scroll.
  const isNearBottomRef = useRef(true);
  // Mirrors conversationId for use inside scroll/visibility handlers, which
  // are registered once and shouldn't need to be re-bound on every id change.
  const conversationIdRef = useRef<string | null>(conversationId);
  conversationIdRef.current = conversationId;
  // Tracks the conversation id this component's local state is already in
  // sync with. When sendMessage creates a conversation mid-send, it updates
  // this ref immediately (see below) so that when the `conversation` prop
  // later catches up to the same id, the sync effect below can tell this is
  // just an echo of our own change -- not real navigation -- and skip
  // clobbering the in-progress messages with the freshly-inserted (still
  // empty) row from the server.
  const knownConversationIdRef = useRef<string | null>(conversation?.id ?? null);

  useEffect(() => {
    if (conversation?.id === knownConversationIdRef.current) return;
    knownConversationIdRef.current = conversation?.id ?? null;
    setMessages(conversation?.messages ?? []);
    setConversationId(conversation?.id ?? null);
  }, [conversation?.id]);

  // Restore the saved scroll position (if any) as soon as this instance
  // mounts, before paint, so we don't flash at the top of the chat first.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const key = conversationIdRef.current ?? NEW_CONVERSATION_SCROLL_KEY;
    const saved = savedScrollPositions.get(key);
    if (saved !== undefined) {
      el.scrollTop = saved;
      isNearBottomRef.current = isNearBottom(el);
    }
  }, []);

  // Track scroll position so we know whether the user is actively reading
  // earlier messages. Only remember a custom position when they've scrolled
  // away from the bottom -- otherwise the default "stick to bottom" behavior
  // is correct and there's nothing to restore later.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleScroll() {
      const near = isNearBottom(el as HTMLDivElement);
      isNearBottomRef.current = near;
      const key = conversationIdRef.current ?? NEW_CONVERSATION_SCROLL_KEY;
      if (near) {
        savedScrollPositions.delete(key);
      } else {
        savedScrollPositions.set(key, (el as HTMLDivElement).scrollTop);
      }
    }
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Save/restore around tab visibility changes (e.g. switching to another
  // browser tab and back) using the Page Visibility API.
  useEffect(() => {
    function handleVisibilityChange() {
      const el = containerRef.current;
      if (!el) return;
      const key = conversationIdRef.current ?? NEW_CONVERSATION_SCROLL_KEY;
      if (document.visibilityState === "hidden") {
        if (isNearBottom(el)) {
          savedScrollPositions.delete(key);
        } else {
          savedScrollPositions.set(key, el.scrollTop);
        }
      } else if (document.visibilityState === "visible") {
        const saved = savedScrollPositions.get(key);
        if (saved !== undefined) {
          el.scrollTop = saved;
          isNearBottomRef.current = isNearBottom(el);
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Auto-scroll to the newest message only if the user was already at (or
  // near) the bottom before it arrived -- never yank them down from a
  // position they scrolled up to on purpose.
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText]);

  async function handleAddFiles(files: FileList) {
    const results = await Promise.all(Array.from(files).map(readFileAsAttachment));
    const added: PendingAttachment[] = [];
    const errors: string[] = [];
    for (const result of results) {
      if (result.attachment) added.push(result.attachment);
      else errors.push(result.error);
    }
    if (added.length > 0) setAttachments((prev) => [...prev, ...added]);
    if (errors.length > 0) setError(errors.join(" "));
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function sendMessage(text: string) {
    if (!text.trim() && attachments.length === 0) return;
    if (!user) return;

    setError(null);
    setInput("");
    const currentAttachments = attachments;
    setAttachments([]);

    const isFirstMessage = messages.length === 0;
    const userMessage: ChatMessage = { role: "user", content: text || "(see attachment)" };
    const historyBeforeThisTurn = messages;
    const nextMessages = [...historyBeforeThisTurn, userMessage];
    setMessages(nextMessages);
    setSending(true);
    setStreamingText("");

    try {
      const assistantText = await streamChatResponse({
        apiKey,
        system: buildSystemPrompt(brandProfile, userProfile),
        history: historyBeforeThisTurn,
        userText: text,
        attachments: currentAttachments,
        onDelta: setStreamingText,
      });

      const finalMessages: ChatMessage[] = [...nextMessages, { role: "assistant", content: assistantText }];
      setMessages(finalMessages);
      setStreamingText(null);

      let id = conversationId;
      if (!id) {
        const created = await onCreateConversation();
        if (created) {
          id = created.id;
          knownConversationIdRef.current = created.id;
          setConversationId(created.id);
          onConversationPersisted(created);
        }
      }
      if (id) {
        onSaveMessages(id, finalMessages, isFirstMessage ? deriveTitle(text) : undefined);
      }

      const extracted = extractProfileFromConversation(finalMessages);
      if (extracted) mergeProfile(extracted);
    } catch (err) {
      setStreamingText(null);
      setMessages([...nextMessages, { role: "assistant", content: friendlyErrorMessage(err) }]);
    } finally {
      setSending(false);
    }
  }

  const showQuickPrompts = messages.length === 0 && !sending;

  return (
    <div className="flex h-full flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && !sending && (
            <div className="mb-2">
              <h2 className="mb-1 text-xl font-semibold text-espresso">What are we working on?</h2>
              <p className="text-sm text-espresso/60">
                Ask Skai anything, or pick a starting point below.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role === "system" ? "assistant" : m.role} content={m.content} />
          ))}

          {sending && streamingText !== null && <MessageBubble role="assistant" content={streamingText || "..."} />}

          {showQuickPrompts && <QuickPrompts onSelect={sendMessage} />}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage(input)}
          disabled={sending}
          attachments={attachments}
          onAddFiles={handleAddFiles}
          onRemoveAttachment={handleRemoveAttachment}
          topSlot={
            messages.length > 0 ? <SuggestionsPanel onSelect={sendMessage} disabled={sending} /> : undefined
          }
        />
      </div>
    </div>
  );
}
