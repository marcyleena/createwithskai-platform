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
export const MONETIZATION_DATA_QUESTION =
  "If paid, what should happen to a user's data if they cancel or stop paying?";

const PAID_MONETIZATION_VALUES = new Set(["one_time", "subscription"]);

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
      // connection?" -- a compound sentence that reads like it wants two
      // answers. It's really one binary question, so it stays a toggle once
      // reworded to ask only the one thing.
      { text: "Should the app work offline without needing an internet connection?", kind: "toggle" },
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
          { value: "retain_lose_access", label: "Retain their data but lose access to paid features" },
          { value: "delete_after_grace", label: "Delete their data after a grace period" },
          { value: NOT_SURE_VALUE, label: "Not sure yet" },
        ],
        showIf: (considerations) => PAID_MONETIZATION_VALUES.has(considerations[MONETIZATION_QUESTION]),
      },
    ],
  },
  {
    title: "Data management",
    questions: [
      {
        // Originally "...as a CSV or PDF?" -- a genuine choice between two
        // formats (or both, or neither), not a yes/no question.
        text: "Should users be able to export their data?",
        kind: "select",
        options: [
          { value: "none", label: "No export needed" },
          { value: "csv", label: "Yes, as CSV" },
          { value: "pdf", label: "Yes, as PDF" },
          { value: "both", label: "Yes, both CSV and PDF" },
          { value: NOT_SURE_VALUE, label: "Not sure yet" },
        ],
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
