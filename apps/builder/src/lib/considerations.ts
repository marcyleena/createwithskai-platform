import type { ConsiderationAnswer, IntakeAnswers } from "./types";

export type ConsiderationInputKind = "toggle" | "select";

export interface ConsiderationSelectOption {
  value: string;
  label: string;
}

export interface ConsiderationQuestion {
  text: string;
  kind: ConsiderationInputKind;
  /** Required when kind is "select". */
  options?: ConsiderationSelectOption[];
  /** When present, the question is only shown once this returns true for the current answers. */
  showIf?: (considerations: Record<string, ConsiderationAnswer>) => boolean;
}

export interface ConsiderationSection {
  title: string;
  questions: ConsiderationQuestion[];
}

// Shared "haven't decided" value across every select question, so
// formatConsiderationsBlock (systemPrompts.ts) can drop it the same way it
// already drops a toggle's "not_sure" -- neither carries an instruction the
// generation prompt should act on.
export const NOT_SURE_VALUE = "not_sure";

export const MONETIZATION_QUESTION = "How will this app be monetized?";
export const MONETIZATION_DATA_QUESTION = "What happens to a user's data if they cancel or stop paying?";

const PAID_MONETIZATION_VALUES = new Set(["one_time", "subscription"]);

export const EXPORT_QUESTION = "Should users be able to export their data?";
export const EXPORT_FORMAT_QUESTION = "What format?";

export const FIXED_SECTIONS: ConsiderationSection[] = [
  {
    title: "Legal and compliance",
    questions: [
      { text: "Does the app need a terms of service page?", kind: "toggle" },
      { text: "Does it need a cookie consent notice for EU visitors?", kind: "toggle" },
      { text: "If it collects emails does it need an unsubscribe option?", kind: "toggle" },
      { text: "If it handles payments does it need a refund policy page?", kind: "toggle" },
    ],
  },
  {
    title: "Mobile and sharing",
    questions: [
      { text: "Is mobile the primary device your users will use?", kind: "toggle" },
      { text: "Should users be able to share specific pages or items with a direct link?", kind: "toggle" },
      // Originally phrased as "...work offline or does it always need an internet
      // connection?" -- a compound sentence offering two named states, not a
      // plain yes/no. Modeled as a select (rather than a toggle) so each
      // option can spell out what it means in plain language.
      {
        text: "Does the app need to work offline?",
        kind: "select",
        options: [
          { value: "yes", label: "Yes -- must work without internet" },
          { value: "no", label: "No -- always requires internet" },
          { value: NOT_SURE_VALUE, label: "Not sure" },
        ],
      },
      { text: "Should users be able to add the app to their phone home screen?", kind: "toggle" },
    ],
  },
  {
    title: "Monetization",
    questions: [
      {
        text: MONETIZATION_QUESTION,
        kind: "select",
        options: [
          { value: "free", label: "Free -- no payment required" },
          { value: "one_time", label: "One-time purchase -- users pay once for lifetime access" },
          { value: "subscription", label: "Subscription -- users pay on a recurring basis" },
          { value: NOT_SURE_VALUE, label: "Not sure yet" },
        ],
      },
      {
        text: MONETIZATION_DATA_QUESTION,
        kind: "select",
        options: [
          { value: "retain_lose_access", label: "They keep their data but lose access to paid features" },
          { value: "delete_after_grace", label: "Their data is deleted after a grace period" },
          { value: NOT_SURE_VALUE, label: "Not sure yet" },
        ],
        showIf: (considerations) => PAID_MONETIZATION_VALUES.has(considerations[MONETIZATION_QUESTION]),
      },
    ],
  },
  {
    title: "Data management",
    questions: [
      // Originally a single question "...as a CSV or PDF?" that conflated
      // whether export should exist at all with which format it should use.
      // Split into a plain yes/no plus a conditional follow-up so the
      // format choice only appears once export itself has been said yes to.
      { text: EXPORT_QUESTION, kind: "toggle" },
      {
        text: EXPORT_FORMAT_QUESTION,
        kind: "select",
        options: [
          { value: "csv", label: "CSV" },
          { value: "pdf", label: "PDF" },
          { value: "both", label: "Both" },
          { value: NOT_SURE_VALUE, label: "Not sure" },
        ],
        showIf: (considerations) => considerations[EXPORT_QUESTION] === "yes",
      },
      { text: "Is there a limit to how much data a user can add?", kind: "toggle" },
      { text: "Should the app remember where the user left off when they come back?", kind: "toggle" },
      { text: "Should users be able to delete their own account and all their data?", kind: "toggle" },
    ],
  },
];

const ALL_FIXED_QUESTIONS: ConsiderationQuestion[] = FIXED_SECTIONS.flatMap((section) => section.questions);

// Dynamic (Claude-generated) questions have no entry here -- they're always
// toggle-type by construction, see buildConsiderationsPrompt.
export function findFixedQuestion(text: string): ConsiderationQuestion | undefined {
  return ALL_FIXED_QUESTIONS.find((q) => q.text === text);
}

// Backstop for buildConsiderationsPrompt (systemPrompts.ts): Claude sometimes
// ignores the "no either/or" rule anyway, most often as "...or only to X" /
// "...or also Y". "or not" and "not sure" aren't real second options -- they're
// how a yes/no question restates itself, or a valid answer state -- so they
// don't trigger this.
const OR_NOT_A_CHOICE = /^(not sure|not)\b/i;

function isEitherOrQuestion(question: string): boolean {
  const match = question.match(/\bor\b\s*([\s\S]*)$/i);
  if (!match) return false;
  return !OR_NOT_A_CHOICE.test(match[1].trim());
}

// Best-effort repair rather than an outright discard: keeping only the
// clause before the first "or" turns "should X be A or B?" into "should X be
// A?" -- a real yes/no question that still covers the same underlying
// consideration, matching the rephrasing the generation prompt itself asks
// Claude to do. Returns null when too little is left to form a sensible
// question, so the caller can drop it instead.
const MIN_SIMPLIFIED_WORDS = 3;

function simplifyEitherOrQuestion(question: string): string | null {
  const orIndex = question.search(/\bor\b/i);
  if (orIndex === -1) return null;
  const clause = question.slice(0, orIndex).trim().replace(/[,;:.\s]+$/, "");
  if (clause.split(/\s+/).filter(Boolean).length < MIN_SIMPLIFIED_WORDS) return null;
  return `${clause}?`;
}

// Runs on every dynamic question before it's shown to the user, catching any
// either/or question Claude generates despite buildConsiderationsPrompt's
// rules against it -- simplified to a yes/no version where salvageable,
// otherwise dropped (shown as one fewer question rather than an invalid one).
export function sanitizeDynamicQuestions(questions: string[]): string[] {
  const sanitized: string[] = [];
  for (const question of questions) {
    if (!isEitherOrQuestion(question)) {
      sanitized.push(question);
      continue;
    }
    const simplified = simplifyEitherOrQuestion(question);
    if (simplified) sanitized.push(simplified);
  }
  return sanitized;
}

// The context sent to Claude to generate app-specific consideration
// questions -- deliberately narrower than the full generation prompt (no
// style/color info), since only the functional shape of the app matters here.
export function buildIntakeSummaryText(answers: IntakeAnswers): string {
  const parts = [
    `App name: ${answers.appName.trim() || "(unnamed)"}`,
    `What it does: ${answers.description.trim()}`,
    `Who it's for: ${answers.audience.trim()}`,
    `Key features: ${answers.features.trim() || "(not specified)"}`,
  ];
  if (answers.usesAI) {
    parts.push(`Uses AI: ${answers.aiDescription.trim() || "(not described)"}`);
  }
  return parts.join("\n");
}
