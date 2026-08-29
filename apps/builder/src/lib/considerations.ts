import type { IntakeAnswers } from "./types";

export interface ConsiderationSection {
  title: string;
  questions: string[];
}

export const FIXED_SECTIONS: ConsiderationSection[] = [
  {
    title: "Legal and compliance",
    questions: [
      "Does the app need a terms of service page?",
      "Does it need a cookie consent notice for EU visitors?",
      "If it collects emails does it need an unsubscribe option?",
      "If it handles payments does it need a refund policy page?",
    ],
  },
  {
    title: "Mobile and sharing",
    questions: [
      "Is mobile the primary device your users will use?",
      "Should users be able to share specific pages or items with a direct link?",
      "Should the app work offline or does it always need an internet connection?",
      "Should users be able to add the app to their phone home screen?",
    ],
  },
  {
    title: "Monetization",
    questions: [
      "Is this app free, one-time purchase, or subscription based?",
      "If subscription, should users who cancel retain access until their period ends?",
      "Should there be a free trial or a free tier with limited features?",
      "What should happen to a user's data if they stop paying?",
    ],
  },
  {
    title: "Data management",
    questions: [
      "Should users be able to export their data as a CSV or PDF?",
      "Is there a limit to how much data a user can add?",
      "Should the app remember where the user left off when they come back?",
      "Should users be able to delete their own account and all their data?",
    ],
  },
];

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
