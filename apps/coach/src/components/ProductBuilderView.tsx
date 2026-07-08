import { useEffect, useRef, useState } from "react";
import { Button } from "@createwithskai/ui";
import type { BrandProfile } from "@createwithskai/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { streamChatResponse, friendlyErrorMessage } from "../lib/anthropic";
import { buildSystemPrompt } from "../lib/systemPrompt";
import { PRODUCT_BUILDER_STAGES } from "../lib/productBuilder";
import { readFileAsAttachment, type PendingAttachment } from "../lib/fileReading";
import type { ChatMessage } from "../hooks/useConversations";

interface ProductBuilderViewProps {
  apiKey: string;
  brandProfile: BrandProfile | null;
  onExit: () => void;
}

const LAST_STAGE = PRODUCT_BUILDER_STAGES.length - 1;

export function ProductBuilderView({ apiKey, brandProfile, onExit }: ProductBuilderViewProps) {
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function sendWithStage(text: string, stageIndex: number, withAttachments: PendingAttachment[] = []) {
    if (!text.trim()) return;
    setError(null);
    setInput("");
    setAttachments([]);

    const history = messages;
    const nextMessages: ChatMessage[] = [...history, { role: "user", content: text }];
    setMessages(nextMessages);
    setSending(true);
    setStreamingText("");

    const system = `${buildSystemPrompt(brandProfile)}\n\n${PRODUCT_BUILDER_STAGES[stageIndex].instruction}`;

    try {
      const assistantText = await streamChatResponse({
        apiKey,
        system,
        history,
        userText: text,
        attachments: withAttachments,
        maxTokens: 8192,
        onDelta: setStreamingText,
      });
      setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      setStreamingText(null);
    } catch (err) {
      setStreamingText(null);
      setMessages([...nextMessages, { role: "assistant", content: friendlyErrorMessage(err) }]);
    } finally {
      setSending(false);
    }
  }

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

  function advanceStage() {
    if (stage >= LAST_STAGE) return;
    const next = stage + 1;
    setStage(next);
    sendWithStage("I'm ready to move to the next stage.", next);
  }

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const canAdvance = messages.length > 0 && !sending && stage < LAST_STAGE;
  const canDownload = stage === LAST_STAGE && !sending && lastAssistantMessage.length > 0;

  function handleDownload() {
    const blob = new Blob([lastAssistantMessage], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "digital-product.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-taupe/30 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-pink">
              Digital Product Builder
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5">
              {PRODUCT_BUILDER_STAGES.map((s, i) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      i < stage
                        ? "bg-accent-pink text-white"
                        : i === stage
                          ? "bg-espresso text-white"
                          : "bg-taupe/30 text-espresso/50"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-xs ${i === stage ? "font-semibold text-espresso" : "text-espresso/50"}`}>
                    {s.shortLabel}
                  </span>
                  {i < PRODUCT_BUILDER_STAGES.length - 1 && <span className="mx-0.5 text-taupe">-</span>}
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={onExit} className="px-4 py-2 text-sm">
            Back to chat
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && !sending && (
            <div className="rounded-xl border border-taupe/40 bg-white p-4 text-sm text-espresso/70">
              Tell me the digital product you want to build -- what it is, roughly, and who it's
              for -- and we'll shape it into a single clear sentence to start.
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role === "system" ? "assistant" : m.role} content={m.content} />
          ))}

          {sending && streamingText !== null && <MessageBubble role="assistant" content={streamingText || "..."} />}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {(canAdvance || canDownload) && (
            <div className="flex justify-center pt-2">
              {canAdvance && (
                <Button variant="dark" onClick={advanceStage}>
                  Continue to {PRODUCT_BUILDER_STAGES[stage + 1].label}
                </Button>
              )}
              {canDownload && (
                <Button variant="dark" onClick={handleDownload}>
                  Download finished product
                </Button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendWithStage(input, stage, attachments)}
          disabled={sending}
          attachments={attachments}
          onAddFiles={handleAddFiles}
          onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
        />
      </div>
    </div>
  );
}
