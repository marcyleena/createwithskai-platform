import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt, buildChangeRequestPrompt } from "./systemPrompts";
import { parseGeneratedFiles } from "./fileParsing";
import type { GeneratedFile, IntakeAnswers, Stack } from "./types";

export const MODEL = "claude-sonnet-4-6";

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
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

function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude didn't return any text.");
  return block.text;
}

export async function generateApp(
  apiKey: string,
  stack: Stack,
  answers: IntakeAnswers
): Promise<GeneratedFile[]> {
  const client = createClient(apiKey);
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: buildGenerationPrompt(stack, answers) }],
  });
  return parseGeneratedFiles(extractText(message));
}

export async function requestChange(
  apiKey: string,
  stack: Stack,
  currentFiles: GeneratedFile[],
  request: string
): Promise<GeneratedFile[]> {
  const client = createClient(apiKey);
  const filesJson = JSON.stringify({ files: currentFiles });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: buildChangeRequestPrompt(stack, filesJson, request) }],
  });
  return parseGeneratedFiles(extractText(message));
}
