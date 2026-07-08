import { useEffect, useRef, useState } from "react";
import { useAuth } from "@createwithskai/auth";
import type { BrandProfile, CoachConversation } from "@createwithskai/types";
import { MessageBubble } from "./MessageBubble";
import { QuickPrompts } from "./QuickPrompts";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(conversation?.messages ?? []);
    setConversationId(conversation?.id ?? null);
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
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
        />
      </div>
    </div>
  );
}
