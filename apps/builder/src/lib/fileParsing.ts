import type { GeneratedFile } from "./types";

const FILE_PATTERN = /~~~FILE:(.+?)~~~\r?\n([\s\S]*?)\r?\n~~~ENDFILE~~~/g;

// Claude streams each file wrapped in ~~~FILE:path~~~ ... ~~~ENDFILE~~~
// markers instead of a JSON envelope -- large source files routinely contain
// quotes, backslashes, and template literals that are easy for a model to
// mis-escape inside a JSON string, and a single bad escape used to break the
// entire parse. Plain delimited text sidesteps escaping entirely, and still
// lets us recover every file that finished even if the response got cut off
// partway through the last one.
export function parseGeneratedFiles(raw: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  FILE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FILE_PATTERN.exec(raw)) !== null) {
    const path = match[1].trim();
    const content = match[2];
    if (path) files.push({ path, content });
  }

  if (files.length === 0) {
    console.warn(`[fileParsing] no files parsed from generation output (${raw.length} chars received).`);
    throw new Error(
      "Claude's response didn't contain any complete files -- it may have been cut off before finishing. Try again, or describe a simpler app."
    );
  }

  console.log(
    "[fileParsing] parsed files from generation output:",
    files.map((f) => `${f.path} (${f.content.length} chars)`)
  );

  return files;
}

// Feeds the current file set back to Claude as context for a change request,
// using the same marker format it's asked to respond in.
export function serializeFiles(files: GeneratedFile[]): string {
  return files.map((f) => `~~~FILE:${f.path}~~~\n${f.content}\n~~~ENDFILE~~~`).join("\n\n");
}

// Merges a diff-style response (only the files Claude actually created or
// modified for a change request) into the complete original file set --
// replaces matching paths in place, appends any genuinely new ones, and
// leaves every other file untouched. This is what keeps a change request
// that only needed to touch one or two files from losing the rest of the
// app, since Claude's response no longer contains them at all.
export function mergeFiles(original: GeneratedFile[], changes: GeneratedFile[]): GeneratedFile[] {
  const merged = [...original];
  for (const changed of changes) {
    const index = merged.findIndex((f) => f.path === changed.path);
    if (index >= 0) merged[index] = changed;
    else merged.push(changed);
  }
  return merged;
}
