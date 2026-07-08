import type { GeneratedFile } from "./types";

// Claude is instructed to respond with only {"files":[...]}, but strip a
// stray markdown fence or leading/trailing prose defensively before parsing.
export function parseGeneratedFiles(raw: string): GeneratedFile[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;

  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude's response didn't contain a JSON files object.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as { files?: GeneratedFile[] };
  if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error("Claude's response was missing a non-empty files array.");
  }

  for (const file of parsed.files) {
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("Claude returned a file without a valid path/content.");
    }
  }

  return parsed.files;
}
