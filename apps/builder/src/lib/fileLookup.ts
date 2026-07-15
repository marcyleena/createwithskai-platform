import type { GeneratedFile, Stack } from "./types";

export function findFile(files: GeneratedFile[], suffix: string): GeneratedFile | undefined {
  return files.find((f) => f.path === suffix || f.path.endsWith(`/${suffix}`));
}

// Claude is instructed to name the entry point "src/App.jsx", but doesn't
// always follow that exactly -- try the common variants, in order of
// preference, before giving up. "index.html" is the last resort: if nothing
// resembling a React entry point turned up, at least render whatever HTML
// was generated instead of a dead end.
const REACT_ENTRY_CANDIDATES = ["src/App.jsx", "App.jsx", "app.jsx", "src/App.tsx", "App.tsx", "index.jsx", "index.html"];

export function findEntryFile(files: GeneratedFile[]): GeneratedFile | undefined {
  for (const candidate of REACT_ENTRY_CANDIDATES) {
    const match = files.find(
      (f) =>
        f.path === candidate ||
        f.path.endsWith(`/${candidate}`) ||
        f.path.toLowerCase() === candidate.toLowerCase()
    );
    if (match) return match;
  }
  return undefined;
}

// For React stacks the entire app lives in one component file (see
// REACT_FILE_RULES in systemPrompts.ts -- "no other component files, no
// code-splitting"), so src/App.jsx is what a change request almost always
// needs to touch. Sending just its full content (plus index.css, in case the
// request is stylistic) instead of every file keeps the diff prompt small
// enough that the model can spend its whole token budget completing that one
// file instead of also having to re-emit untouched boilerplate
// (main.jsx/vite.config.js/package.json never change based on a feature
// request -- App.jsx can only import from "react", so its dependencies are
// fixed by the stack). Static-html apps are already just the one file.
export function selectRelevantFiles(files: GeneratedFile[], stack: Stack): GeneratedFile[] {
  if (stack === "static-html") return files;

  const relevant: GeneratedFile[] = [];
  const entry = findEntryFile(files);
  if (entry) relevant.push(entry);

  const css = findFile(files, "index.css");
  if (css && css.path !== entry?.path) relevant.push(css);

  // Couldn't identify anything -- fall back to sending everything rather
  // than silently sending nothing.
  return relevant.length > 0 ? relevant : files;
}
