import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt, buildChangeRequestPrompt } from "./systemPrompts";
import { parseGeneratedFiles, serializeFiles } from "./fileParsing";
import type { GeneratedFile, IntakeAnswers, Stack } from "./types";

export const MODEL = "claude-sonnet-4-6";

// Generous headroom for a full multi-file app -- combined with the
// conciseness constraint in the generation prompt, this should comfortably
// cover a focused first version without truncating mid-file.
const MAX_TOKENS = 16000;

const TOO_SHORT_INSTRUCTION =
  "\n\nYour previous attempt got cut off before it finished -- it was too long. This time, keep the app significantly shorter and simpler (fewer files, less code per file) while still being fully functional and complete.";

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

// Streams the response and accumulates it as plain text (not JSON) -- see
// fileParsing.ts for why the file transport itself is delimited text rather
// than a JSON envelope.
async function streamText(apiKey: string, prompt: string, onProgress?: (charsSoFar: number) => void): Promise<string> {
  const client = createClient(apiKey);
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  if (onProgress) {
    stream.on("text", (_delta, snapshot) => onProgress(snapshot.length));
  }
  return stream.finalText();
}

// Runs a generation prompt and parses the result, retrying once with an
// explicit "keep it shorter" instruction if the first attempt got cut off
// before producing any complete files.
async function generateWithRetry(
  apiKey: string,
  prompt: string,
  onProgress?: (charsSoFar: number) => void
): Promise<GeneratedFile[]> {
  try {
    const text = await streamText(apiKey, prompt, onProgress);
    return parseGeneratedFiles(text);
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("didn't contain any complete files")) {
      throw err;
    }
    const retryText = await streamText(apiKey, prompt + TOO_SHORT_INSTRUCTION, onProgress);
    return parseGeneratedFiles(retryText);
  }
}

export async function generateApp(
  apiKey: string,
  stack: Stack,
  answers: IntakeAnswers,
  onProgress?: (charsSoFar: number) => void
): Promise<GeneratedFile[]> {
  return generateWithRetry(apiKey, buildGenerationPrompt(stack, answers), onProgress);
}

export async function requestChange(
  apiKey: string,
  stack: Stack,
  currentFiles: GeneratedFile[],
  request: string,
  onProgress?: (charsSoFar: number) => void
): Promise<GeneratedFile[]> {
  if (currentFiles.length === 0) {
    // Nothing to send as context -- this would silently turn into a
    // from-scratch generation, which is exactly the bug this guards against.
    throw new Error("Can't apply a change request -- no existing files were found for this build.");
  }

  console.log(
    "[requestChange] sending existing files as context:",
    currentFiles.map((f) => `${f.path} (${f.content.length} chars)`)
  );

  const prompt = buildChangeRequestPrompt(stack, serializeFiles(currentFiles), request);
  const updatedFiles = await generateWithRetry(apiKey, prompt, onProgress);

  // Full replacement, not a merge -- the response above already contains every
  // file the app needs (the prompt requires unchanged files to be echoed back
  // untouched), so merging with the old set here would only risk keeping a
  // stale copy of a file Claude did intend to change.
  return updatedFiles;
}
