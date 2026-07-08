import type { IntakeAnswers, Stack } from "./types";

// Exactly four questions, asked in order, before we generate anything.
export const INTAKE_QUESTIONS: Array<{ key: keyof IntakeAnswers; prompt: string }> = [
  { key: "summary", prompt: "What does the app do? Describe it in one sentence." },
  { key: "audience", prompt: "Who is it for?" },
  { key: "needsAccounts", prompt: "Does it need user accounts, so people can log in?" },
  { key: "needsPersistence", prompt: "Does it need to save data between sessions -- so it's still there after closing and reopening?" },
];

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
Produce exactly one file: index.html.
${FILE_FORMAT}`;
  }

  if (stack === "react-localstorage") {
    return `Generate a small React app (Vite + React) that uses plain useState/useEffect and the browser's localStorage API to persist data between sessions.
Produce exactly these files:
- package.json (vite, react, react-dom as dependencies)
- vite.config.js
- index.html (loads /src/main.jsx as a module script)
- src/main.jsx (mounts <App /> from src/App.jsx into #root)
- src/App.jsx (the entire app)
- src/index.css (styling)
${REACT_FILE_RULES}
${FILE_FORMAT}`;
  }

  return `Generate a small React app (Vite + React) that needs user accounts and/or a shared database via Supabase.
A Supabase client is already created and available as the global "window.supabase" -- call it directly from App.jsx (e.g. window.supabase.auth.signInWithPassword({ email, password }), window.supabase.from("table_name").select("*")). Do not import or create a Supabase client inside App.jsx.
Produce exactly these files:
- package.json (vite, react, react-dom, @supabase/supabase-js as dependencies)
- vite.config.js
- index.html
- src/main.jsx (creates the real Supabase client from import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, assigns it to window.supabase, then mounts <App />)
- src/App.jsx (the entire app, using window.supabase for every backend call)
- src/index.css (styling)
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

export function buildGenerationPrompt(stack: Stack, answers: IntakeAnswers): string {
  return `You are generating a web app from a short intake conversation.

${QUALITY_BAR}

What the app does: ${answers.summary}
Who it's for: ${answers.audience}
Needs user accounts: ${answers.needsAccounts}
Needs to save data between sessions: ${answers.needsPersistence}

${stackInstructions(stack)}`;
}

export function buildChangeRequestPrompt(stack: Stack, currentFiles: string, request: string): string {
  return `You are updating an existing generated web app based on a change request. Here are the current files:

${currentFiles}

The user's change request: "${request}"

Apply the requested change while keeping everything else working.

${QUALITY_BAR}

${stackInstructions(stack)}

Return the COMPLETE, updated set of files (not a diff) -- every file the app needs, including any that didn't change.`;
}
