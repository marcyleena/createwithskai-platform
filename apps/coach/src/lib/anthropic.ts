import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources/messages";

export const CHAT_MODEL = "claude-sonnet-4-6";

export interface ChatAttachment {
  name: string;
  kind: "image" | "pdf" | "text";
  mimeType: string;
  /** Base64 for image/pdf, raw text content for "text". */
  data: string;
}

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function attachmentToBlock(attachment: ChatAttachment): ContentBlockParam {
  if (attachment.kind === "image") {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: attachment.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: attachment.data,
      },
    };
  }
  if (attachment.kind === "pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: attachment.data },
    };
  }
  return {
    type: "document",
    source: { type: "text", media_type: "text/plain", data: attachment.data },
    title: attachment.name,
  };
}

function buildUserContent(text: string, attachments: ChatAttachment[]): string | ContentBlockParam[] {
  if (attachments.length === 0) return text;
  const blocks: ContentBlockParam[] = attachments.map(attachmentToBlock);
  blocks.push({ type: "text", text: text || "See attached." });
  return blocks;
}

export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Your Anthropic API key was rejected. Double-check it at createwithskai.cloud.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "That Anthropic API key doesn't have permission to use this model.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Anthropic is rate-limiting this API key right now -- give it a moment and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong talking to Anthropic.";
}

interface StreamChatOptions {
  apiKey: string;
  system: string;
  history: ChatTurn[];
  userText: string;
  attachments?: ChatAttachment[];
  maxTokens?: number;
  onDelta?: (fullTextSoFar: string) => void;
}

// Streams a single assistant reply and resolves with the complete text.
export async function streamChatResponse({
  apiKey,
  system,
  history,
  userText,
  attachments = [],
  maxTokens = 4096,
  onDelta,
}: StreamChatOptions): Promise<string> {
  const client = createClient(apiKey);

  const messages: MessageParam[] = [
    ...history
      .filter((turn): turn is ChatTurn & { role: "user" | "assistant" } => turn.role !== "system")
      .map((turn) => ({ role: turn.role, content: turn.content }) satisfies MessageParam),
    { role: "user", content: buildUserContent(userText, attachments) },
  ];

  const stream = client.messages.stream({
    model: CHAT_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });

  if (onDelta) {
    stream.on("text", (_delta, snapshot) => onDelta(snapshot));
  }

  return stream.finalText();
}

// A small, non-streaming call used for background tasks (brand-info
// extraction, title generation) where we just need a short text result.
export async function quickCompletion(apiKey: string, prompt: string, maxTokens = 300): Promise<string> {
  const client = createClient(apiKey);
  const message = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
