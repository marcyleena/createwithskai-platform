import type { GeneratedFile } from "./types";

/** The shape generated files are persisted in -- a plain object keyed by file path. */
export type StoredFiles = Record<string, string>;

export function filesToRecord(files: GeneratedFile[]): StoredFiles {
  const record: StoredFiles = {};
  for (const file of files) record[file.path] = file.content;
  return record;
}

// Tolerant of the pre-existing GeneratedFile[] array shape some already-saved
// builds still have, so those continue to load correctly after this format
// change instead of silently losing their files.
export function filesFromRecord(stored: unknown): GeneratedFile[] {
  if (Array.isArray(stored)) {
    return stored.filter(
      (f): f is GeneratedFile =>
        Boolean(f) && typeof f === "object" && typeof f.path === "string" && typeof f.content === "string"
    );
  }
  if (stored && typeof stored === "object") {
    return Object.entries(stored as StoredFiles)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([path, content]) => ({ path, content }));
  }
  return [];
}
