import type { IntakeAnswers, Stack } from "./types";
import { findStyleTile } from "./styleTiles";
import { resolveAppName } from "./naming";

// Files are transported as plain delimited text, not JSON. Real source code
// is full of quotes, backslashes, and template literals that are easy for a
// model to mis-escape inside a JSON string -- one bad escape breaks the
// entire response. Plain markers avoid escaping entirely and let us recover
// whatever files finished even if a response gets cut off.
const FILE_FORMAT = `Output every file wrapped in these exact markers, with no JSON, no markdown code fences, and no commentary before, between, or after them:
~~~FILE:path/to/file~~~
(the complete raw file content, written exactly as it should appear in the file -- no escaping, no quoting)
~~~ENDFILE~~~

Repeat that block for every file, one after another.`;

const REACT_FILE_RULES = `Rules for src/App.jsx specifically, because it also has to run standalone in a live preview:
- Export the component as a named function: function App() { ... } and put "export default App;" alone on the last line.
- Only import from "react" (e.g. import { useState, useEffect } from "react";). Do not import any other package inside App.jsx.
- Do not import CSS files inside App.jsx; styling lives in src/index.css and is loaded separately.
- The whole app must live in this one component file -- no other component files, no code-splitting.`;

function stackInstructions(stack: Stack): string {
  if (stack === "static-html") {
    return `Generate a single, complete HTML file with embedded <style> and <script> tags. No external dependencies, no build step, no imports -- it must be fully self-contained and immediately functional when opened directly in a browser.
Produce exactly one file, named exactly "index.html", and make it the first and only thing in your output.
${FILE_FORMAT}`;
  }

  const entryFirstRule = `Output "src/App.jsx" FIRST, before any other file -- it is the app's entry point and the live preview depends on it. Producing it first guarantees it exists even if your response gets cut off before you finish the remaining files.`;

  if (stack === "react-localstorage") {
    return `Generate a small React app (Vite + React) that uses plain useState/useEffect and the browser's localStorage API to persist data between sessions.
${entryFirstRule}
Produce exactly these files, in this order:
- src/App.jsx (the entire app -- FIRST)
- src/index.css (styling)
- src/main.jsx (mounts <App /> from src/App.jsx into #root)
- index.html (loads /src/main.jsx as a module script)
- vite.config.js
- package.json (vite, react, react-dom as dependencies)
${REACT_FILE_RULES}
${FILE_FORMAT}`;
  }

  return `Generate a small React app (Vite + React) that needs user accounts and/or a shared database via Supabase.
A Supabase client is already created and available as the global "window.supabase" -- call it directly from App.jsx (e.g. window.supabase.auth.signInWithPassword({ email, password }), window.supabase.from("table_name").select("*")). Do not import or create a Supabase client inside App.jsx.
${entryFirstRule}
Produce exactly these files, in this order:
- src/App.jsx (the entire app, using window.supabase for every backend call -- FIRST)
- src/index.css (styling)
- src/main.jsx (creates the real Supabase client from import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, assigns it to window.supabase, then mounts <App />)
- index.html
- vite.config.js
- package.json (vite, react, react-dom, @supabase/supabase-js as dependencies)
- SUPABASE_SETUP.md (plain-language list of the tables/columns this app expects the user to create in their own Supabase project, since no backend is provisioned automatically)
${REACT_FILE_RULES}
${FILE_FORMAT}`;
}

const QUALITY_BAR = `Build this to production-ready quality -- something the user could hand directly to real customers and charge money for today. That means:
- Clean, well-architected code: sensible component/state structure, clear naming, no dead code.
- Proper error handling: never let an operation fail silently; surface a clear message when something goes wrong (a failed fetch, invalid input, a rejected auth call).
- Input validation: validate anything the user types or submits before acting on it, and give specific feedback when it's invalid.
- Loading states: show a clear loading/pending indicator for anything asynchronous (initial load, submits, auth).
- Empty states: every list, table, or feed needs a designed empty state for when there's no data yet, not a blank screen.
- Accessible markup: semantic HTML elements, labels tied to inputs, sufficient color contrast, visible focus states, and keyboard operability.
- Performance: avoid unnecessary re-renders, don't do expensive work on every keystroke/render, keep the bundle lean.
- Scope: generate the minimum viable complete app. Every core feature described below must actually work end to end, with no placeholder or "coming soon" sections -- but nothing beyond what was described. Keep this initial version focused and concise: a single well-structured file for static apps, or a minimal but complete set of files for React apps. The user can ask for additions afterward through the change-request flow.`;

function visualDirectionText(answers: IntakeAnswers): string {
  const tile = findStyleTile(answers.styleTile);
  const parts: string[] = [];
  if (tile) parts.push(`${tile.label} -- ${tile.description}`);
  if (answers.customVibe.trim()) parts.push(`Additional direction from the user: ${answers.customVibe.trim()}`);
  if (parts.length === 0) {
    return "No specific direction was given -- use your best judgment for a polished, cohesive, distinctive look (avoid a generic default Bootstrap-like appearance).";
  }
  return parts.join(" ");
}

function colorPaletteText(answers: IntakeAnswers): string {
  if (answers.colorInput.trim()) {
    return `Use this color palette throughout: ${answers.colorInput.trim()}`;
  }
  return "No specific colors were given -- invent a cohesive color palette that matches the visual direction above, and apply it consistently across every screen and component.";
}

function aiFeatureText(answers: IntakeAnswers): string {
  if (!answers.usesAI) return "";
  const description = answers.aiDescription.trim() || "(not described further by the user)";
  return `
This app needs a real, working AI feature: ${description}
Implement it for real, not a mock -- call the Anthropic Messages API (model "claude-sonnet-4-6") directly from the client with fetch. Ask the user for their own Anthropic API key once in a simple settings area, store it in localStorage, and use it for every AI call. Handle the loading and error states for these calls the same as any other async operation in the app.`;
}

export function buildGenerationPrompt(stack: Stack, answers: IntakeAnswers): string {
  const appName = resolveAppName(answers);
  const featureList = answers.features.trim() || "(none listed -- infer the minimal set of features the description above requires)";

  return `You are generating a web app from a detailed intake.

${QUALITY_BAR}

App name: ${appName}
What it does: ${answers.description}
Who it's for: ${answers.audience}

Visual direction: ${visualDirectionText(answers)}
Color palette: ${colorPaletteText(answers)}
Apply this visual direction and color palette throughout the app -- typography, spacing, and every component's styling should consistently reflect it. Do not fall back to a generic look.

Core features (implement every one of these completely and end to end -- no placeholders):
${featureList}

Needs user accounts: ${answers.needsAccounts ? "Yes" : "No"}
Needs to save data between sessions: ${answers.needsPersistence ? "Yes" : "No"}
Uses AI: ${answers.usesAI ? "Yes" : "No"}
${aiFeatureText(answers)}
${answers.specialRequirements.trim() ? `Special requirements: ${answers.specialRequirements.trim()}` : ""}

${stackInstructions(stack)}`;
}

const STYLE_PRESERVATION_RULE = `Preserve the existing design exactly -- do not regenerate the app's look from scratch. Specifically:
- When modifying existing files, preserve all existing CSS classes, style imports, and design tokens exactly as they are. Only add or change the minimum code needed to implement the requested feature.
- When adding new files, match the exact same styling patterns, class names, and design tokens used in the existing files -- do not invent a different visual style.`;

// Deliberately NOT the same as stackInstructions() used for fresh generation
// -- that text ("Generate a small React app...", "Produce exactly these
// files") reads as a from-scratch spec, and landing at the end of a change
// request prompt it tended to override the preservation instructions above
// it. This keeps only the format/contract rules a change request still needs.
function changeRequestFileRules(stack: Stack): string {
  if (stack === "static-html") {
    return `The app is a single "index.html" file. Return it wrapped in the same ~~~FILE:index.html~~~ / ~~~ENDFILE~~~ markers.
${FILE_FORMAT}`;
  }
  return `${REACT_FILE_RULES}
${FILE_FORMAT}`;
}

export function buildChangeRequestPrompt(stack: Stack, currentFiles: string, request: string): string {
  return `Here are the existing files in this app, exactly as they exist right now:

${currentFiles}

Make only the changes needed to implement this request: "${request}"

${STYLE_PRESERVATION_RULE}

${QUALITY_BAR}

You are editing the files shown above -- you are not writing a new app from scratch, and the files above are not a reference example. Return ALL files from the app, including every one that doesn't need to change, using the same ~~~FILE:path~~~ delimiter format they were shown in above. A file that doesn't need to change must be returned byte-for-byte identical to the version shown above -- do not omit it, and do not rewrite it "for consistency" or any other reason.

${changeRequestFileRules(stack)}`;
}
