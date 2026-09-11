import type { ConsiderationAnswer, IntakeAnswers, Stack } from "./types";
import { findStyleTile } from "./styleTiles";
import { resolveAppName } from "./naming";
import { findFixedQuestion, NOT_SURE_VALUE } from "./considerations";

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

// Static-html apps embed their <style> tag inline rather than shipping a
// separate CSS file, so the "CSS file first" ordering below doesn't apply --
// this note tells the model to still front-load the theme within that one
// file instead of writing markup first and styling as an afterthought.
const STATIC_HTML_STYLE_FIRST_RULE = `Write the <style> block, with the full color palette and typography defined as CSS custom properties on :root, immediately after <head> opens -- before any markup or script. That way the theme is complete and applied even if the response gets cut off partway through the rest of the file.`;

function stackInstructions(stack: Stack): string {
  if (stack === "static-html") {
    return `Generate a single, complete HTML file with embedded <style> and <script> tags. No external dependencies, no build step, no imports -- it must be fully self-contained and immediately functional when opened directly in a browser.
${STATIC_HTML_STYLE_FIRST_RULE}
Produce exactly one file, named exactly "index.html", and make it the first and only thing in your output.
${FILE_FORMAT}`;
  }

  // A full src/index.css (palette + typography + every component's styles)
  // output first was itself the bug this replaced: a complex app's CSS alone
  // can run long enough to exhaust the response before src/App.jsx -- the
  // entry point the preview actually depends on -- ever gets written, so
  // generation failed with no App.jsx at all despite CSS being fine on its
  // own. Splitting index.css into a minimal pass (just the custom properties
  // every component reads from) up front, App.jsx and the rest of the
  // project right after, and the full component styling only at the very
  // end means a cutoff there drops component styles, not the entry point.
  const styleFirstRule = `Output files in this exact order: first, "src/index.css" containing ONLY the CSS custom properties, root variables, and a base reset -- no component styles yet; second, "src/App.jsx" as the main entry point; third, the rest of the project's files (see the list below); fourth, go back and add the full component styling -- either by rewriting "src/index.css" completely (every style the app needs, still built on the custom properties from step one) or by adding a separate "src/components.css" file for it. This order guarantees the color palette is defined and the entry point exists even if the response is cut off before that final, fuller styling pass finishes.`;

  if (stack === "react-localstorage") {
    return `Generate a small React app (Vite + React) that uses plain useState/useEffect and the browser's localStorage API to persist data between sessions.
${styleFirstRule}
Produce exactly these files, in this order:
- src/index.css -- FIRST, but only custom properties/root variables and a base reset at this point
- src/App.jsx -- SECOND, the entire app
- src/main.jsx (mounts <App /> from src/App.jsx into #root)
- index.html (loads /src/main.jsx as a module script)
- vite.config.js
- package.json (vite, react, react-dom as dependencies)
- src/index.css again, now rewritten with the full component styling (or src/components.css as a separate file) -- LAST, after everything else
${REACT_FILE_RULES}
${FILE_FORMAT}`;
  }

  return `Generate a small React app (Vite + React) that needs user accounts and/or a shared database via Supabase.
A Supabase client is already created and available as the global "window.supabase" -- call it directly from App.jsx (e.g. window.supabase.auth.signInWithPassword({ email, password }), window.supabase.from("table_name").select("*")). Do not import or create a Supabase client inside App.jsx.
${styleFirstRule}
Produce exactly these files, in this order:
- src/index.css -- FIRST, but only custom properties/root variables and a base reset at this point
- src/App.jsx -- SECOND, the entire app, using window.supabase for every backend call
- src/main.jsx (creates the real Supabase client from import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, assigns it to window.supabase, then mounts <App />)
- index.html
- vite.config.js
- package.json (vite, react, react-dom, @supabase/supabase-js as dependencies)
- SUPABASE_SETUP.md (plain-language list of the tables/columns this app expects the user to create in their own Supabase project, since no backend is provisioned automatically)
- src/index.css again, now rewritten with the full component styling (or src/components.css as a separate file) -- LAST, after everything else
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
- Icon-only buttons: if a button has only an icon and no visible text, give it a descriptive "title" attribute and an "aria-label" for accessibility.
- Optimistic UI: when a user submits a form, saves data, or toggles a setting, update the UI immediately rather than waiting for a server response -- then handle server errors gracefully with a revert if the operation fails.
- Pagination: any list that could grow over time (transactions, entries, posts, records, history) must never load all records at once -- use a page size of 20 items with a load more button or infinite scroll.
- No N+1 queries: when displaying a list of items that each have related data, fetch all related data in a single query using joins or batch fetches rather than one query per item.
- Parallel async: independent operations must run asynchronously and in parallel where possible -- use Promise.all instead of chaining unrelated async calls sequentially.
- Performance: avoid unnecessary re-renders, don't do expensive work on every keystroke/render, keep the bundle lean.
- Scope: generate the minimum viable complete app. Every core feature described below must actually work end to end, with no placeholder or "coming soon" sections -- but nothing beyond what was described. Keep this initial version focused and concise: a single well-structured file for static apps, or a minimal but complete set of files for React apps. The user can ask for additions afterward through the change-request flow.
- If the app collects any user data -- emails, names, form submissions, or any other personally identifiable information -- include a simple privacy policy footer or modal that lists what data is collected and states it is not shared with third parties.
- If the app uses AI in any way -- calling an API, generating content, or making decisions -- include a visible disclosure that the feature is AI-powered. This is required for EU compliance as of August 2025.
Generate both of these automatically whenever they apply -- do not wait for the user to ask for them.`;

export function buildConsiderationsPrompt(intakeSummary: string): string {
  return `You are helping someone build a web app. Based on the app description below, generate five to eight short consideration questions the builder should think about before generating their app.
STRICT RULES -- violating any of these means the question is invalid and must not be included:

1. Every question MUST be answerable with YES or NO only. No either/or questions. No choosing between options. No multiple choice.
2. NEVER ask 'should X or Y' -- this is an either/or question and is forbidden. Instead ask 'should X?' as a standalone yes/no question.
3. NEVER ask compound questions that contain 'or' as a choice between two approaches. The word 'or' is a signal the question is invalid.
4. NEVER ask about frequency, format, or method choices -- these cannot be yes/no.
5. Questions must be specific to this app type -- not generic questions that apply to any app.
6. Use plain non-technical language a non-developer would understand immediately.
7. Keep each question under fifteen words.

VALID example: 'Should users be able to see ratings without creating an account?'
INVALID example: 'Should ratings be visible to anyone or only to logged in users?' -- this contains 'or' as a choice and is forbidden.
VALID example: 'Should the AI tips use information from outside the app?'
INVALID example: 'Should AI tips be based only on in-app data or also pull from outside sources?' -- either/or, forbidden.
Return ONLY a valid JSON array of question strings. No other text. No markdown. No explanation.
App description: ${intakeSummary}`;
}

// Only a real decision carries instruction -- "Not sure" (toggle) and the
// shared not-sure select option both mean "apply a sensible default," which
// is already the model's fallback behavior, so including them would just be
// noise. `considerations` is optional because builds saved before this
// feature exist without the field.
function formatConsiderationsBlock(considerations: Record<string, ConsiderationAnswer> | undefined): string {
  if (!considerations) return "";
  const lines: string[] = [];
  for (const [question, answer] of Object.entries(considerations)) {
    if (!answer || answer === NOT_SURE_VALUE) continue;
    const definition = findFixedQuestion(question);
    if (definition?.kind === "select") {
      const option = definition.options?.find((o) => o.value === answer);
      if (option) lines.push(`${question}: ${option.label}`);
    } else if (answer === "yes" || answer === "no") {
      // Dynamic (Claude-generated) questions have no fixed definition and
      // are always toggle-type, so they fall through to this branch too.
      lines.push(`${question}: ${answer === "yes" ? "Yes" : "No"}`);
    }
  }
  if (lines.length === 0) return "";
  return `USER CONSIDERATIONS:\n${lines.join("\n")}`;
}

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

const CSS_CUSTOM_PROPERTIES_RULE = `The color palette above MUST be defined as CSS custom properties at the root level (:root in src/index.css, or in the <style> block for a static HTML app) -- e.g. --color-primary, --color-secondary, --color-background, --color-text -- and every component's styling must reference them with var(--color-primary) etc. Never hardcode hex/rgb colors that bypass the palette.`;

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

  const considerationsBlock = formatConsiderationsBlock(answers.considerations);

  return `You are generating a web app from a detailed intake.

${QUALITY_BAR}
${considerationsBlock ? `\n${considerationsBlock}\n` : ""}
App name: ${appName}
What it does: ${answers.description}
Who it's for: ${answers.audience}

Visual direction: ${visualDirectionText(answers)}
Color palette: ${colorPaletteText(answers)}
Apply this visual direction and color palette throughout the app -- typography, spacing, and every component's styling should consistently reflect it. Do not fall back to a generic look.
${CSS_CUSTOM_PROPERTIES_RULE}

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

const SURGICAL_EDIT_RULE = `Be surgical about this change:
- Only touch files that actually need new or changed code to implement the request -- see the diff instructions below for exactly what to return. Do not "improve" or refactor files the request doesn't touch.
- Prioritize completing what you start over maximizing scope. A response that gets cut off mid-file because it tried to do too much is worse than a smaller but fully working implementation -- finish every file you start before spending effort on nice-to-haves the request didn't ask for.
- If a requested feature would require more than 300 lines of new code, implement a simplified but functional version first. The user can request enhancements afterward.`;

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

export function buildChangeRequestPrompt(
  stack: Stack,
  allFilePaths: string[],
  relevantFiles: string,
  request: string
): string {
  return `This app already exists. Its complete list of files is:
${allFilePaths.map((p) => `- ${p}`).join("\n")}

You were sent the full current content of only the file(s) most likely relevant to this request, exactly as they exist right now:

${relevantFiles}

Make only the changes needed to implement this request: "${request}"

${STYLE_PRESERVATION_RULE}

${SURGICAL_EDIT_RULE}

${QUALITY_BAR}

You are editing an existing app, not writing a new one from scratch, and the file(s) above are not a reference example. This is a diff, not a full regeneration: return ONLY the files you actually created or changed to implement this request, using the ~~~FILE:path~~~ delimiter format below. Do not return a file whose content isn't changing -- every file not in your response stays exactly as it already is, so omitting an unchanged file is correct, not an oversight. If implementing this request genuinely requires changing a file that wasn't shown above, you may still return it, but only when you have a real, specific reason to change its content -- not out of caution.

${changeRequestFileRules(stack)}`;
}
