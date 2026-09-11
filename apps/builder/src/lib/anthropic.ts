import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt, buildChangeRequestPrompt, buildConsiderationsPrompt } from "./systemPrompts";
import { parseGeneratedFiles, serializeFiles, mergeFiles } from "./fileParsing";
import { selectRelevantFiles } from "./fileLookup";
import { sanitizeDynamicQuestions } from "./considerations";
import type { GeneratedFile, IntakeAnswers, Stack } from "./types";

export const MODEL = "claude-sonnet-4-6";

// Generous headroom for a full multi-file app -- combined with the
// conciseness constraint in the generation prompt, this should comfortably
// cover a focused first version without truncating mid-file. Raised from
// 20000 to give complex, multi-feature apps more room to complete every
// feature they attempt (see COMPLETENESS_OVER_SCOPE_RULE in
// systemPrompts.ts, which asks Claude to scale back scope rather than run
// over this budget).
const MAX_TOKENS = 24000;

const TOO_SHORT_INSTRUCTION =
  "\n\nYour previous attempt got cut off before it finished -- it was too long. This time, keep the app significantly shorter and simpler (fewer files, less code per file) while still being fully functional and complete.";

export interface GenerationProgress {
  charsSoFar: number;
  /** Path of the file whose ~~~FILE: marker most recently appeared in the stream, or null before the first one arrives. */
  currentFile: string | null;
}

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// Only needs the opening marker (not a matching ENDFILE) so the UI can show
// "Generating X" the moment Claude starts a file, not after it finishes one.
const FILE_MARKER_PATTERN = /~~~FILE:(.+?)~~~/g;

function latestFileMarker(snapshot: string): string | null {
  FILE_MARKER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = FILE_MARKER_PATTERN.exec(snapshot)) !== null) {
    last = match[1].trim();
  }
  return last;
}

// The SDK's `stream.on("text")` fires on every token (tens of times a
// second), and wiring that directly to a React state setter -- which is what
// this used to do -- forced a re-render per token. That doesn't slow down
// generation itself (the model streams at the same rate regardless), but it
// did make the UI noticeably janky on longer generations, which reads as
// "slow." Throttling emission to a fixed interval keeps the progress display
// smooth without hiding real progress: a file-name change always emits
// immediately (it's the signal users actually care about), everything else
// is capped to one update per interval.
const PROGRESS_EMIT_INTERVAL_MS = 150;

function throttledProgressEmitter(onProgress: (progress: GenerationProgress) => void) {
  let lastEmitAt = 0;
  let lastFile: string | null = null;
  return (snapshot: string) => {
    const currentFile = latestFileMarker(snapshot);
    const fileChanged = currentFile !== lastFile;
    const now = Date.now();
    if (!fileChanged && now - lastEmitAt < PROGRESS_EMIT_INTERVAL_MS) return;
    lastEmitAt = now;
    lastFile = currentFile;
    onProgress({ charsSoFar: snapshot.length, currentFile });
  };
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
  // Must come before the APIConnectionError check -- APIConnectionTimeoutError
  // extends it, and a timeout deserves its own message ("try a simpler app")
  // rather than the generic connectivity one below.
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return "The request to Anthropic timed out -- this can happen on a complex app. Try again, or describe a simpler app.";
  }
  // Thrown when the request never got a response at all (DNS failure, the
  // request being blocked, no internet) rather than the API rejecting it --
  // distinct from AuthenticationError/RateLimitError/etc, which all mean
  // Anthropic *did* respond. This is what a real "network error" looks like.
  if (err instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach Anthropic's servers -- check your internet connection and try again. If this keeps happening, a browser extension, firewall, or network filter may be blocking the request.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error: ${err.message}`;
  }
  // A bare fetch failure that never made it into the SDK's own error
  // hierarchy above (e.g. thrown before the request could even be built).
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return "Network error -- couldn't reach the server. Check your internet connection and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong talking to Anthropic.";
}

// Streams the response and accumulates it as plain text (not JSON) -- see
// fileParsing.ts for why the file transport itself is delimited text rather
// than a JSON envelope.
async function streamText(
  apiKey: string,
  prompt: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<string> {
  const client = createClient(apiKey);
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  if (onProgress) {
    const emit = throttledProgressEmitter(onProgress);
    stream.on("text", (_delta, snapshot) => emit(snapshot));
  }
  return stream.finalText();
}

// Runs a generation prompt and parses the result, retrying once with an
// explicit "keep it shorter" instruction if the first attempt got cut off
// before producing any complete files.
async function generateWithRetry(
  apiKey: string,
  prompt: string,
  onProgress?: (progress: GenerationProgress) => void
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

// Strict best-effort parse: any deviation from "a JSON array of strings"
// (a stray code fence, a refusal, malformed JSON) just yields no dynamic
// questions rather than throwing -- this call must never block generation.
function parseQuestionsResponse(text: string): string[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return [];
}

// Lightweight, non-streaming call used on the intake summary screen to
// generate app-specific consideration questions -- small prompt, small
// response, no need for the streaming/retry machinery generateApp uses.
export async function generateConsiderationQuestions(apiKey: string, intakeSummary: string): Promise<string[]> {
  const client = createClient(apiKey);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: buildConsiderationsPrompt(intakeSummary) }],
  });
  const textBlock = response.content.find((block) => block.type === "text");
  const questions = textBlock ? parseQuestionsResponse(textBlock.text) : [];
  return sanitizeDynamicQuestions(questions);
}

export async function generateApp(
  apiKey: string,
  stack: Stack,
  answers: IntakeAnswers,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedFile[]> {
  return generateWithRetry(apiKey, buildGenerationPrompt(stack, answers), onProgress);
}

export async function requestChange(
  apiKey: string,
  stack: Stack,
  currentFiles: GeneratedFile[],
  request: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedFile[]> {
  if (currentFiles.length === 0) {
    // Nothing to send as context -- this would silently turn into a
    // from-scratch generation, which is exactly the bug this guards against.
    throw new Error("Can't apply a change request -- no existing files were found for this build.");
  }

  const relevantFiles = selectRelevantFiles(currentFiles, stack);
  console.log(
    "[requestChange] sending relevant files as context:",
    relevantFiles.map((f) => `${f.path} (${f.content.length} chars)`)
  );

  const allPaths = currentFiles.map((f) => f.path);
  const prompt = buildChangeRequestPrompt(stack, allPaths, serializeFiles(relevantFiles), request);
  const changedFiles = await generateWithRetry(apiKey, prompt, onProgress);

  // Claude now only returns the files it actually created or modified (see
  // buildChangeRequestPrompt) -- merge those into the complete existing set
  // instead of replacing it, so files outside the relevant subset are never
  // dropped just because they weren't part of the response.
  return mergeFiles(currentFiles, changedFiles);
}
