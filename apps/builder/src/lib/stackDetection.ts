import type { IntakeAnswers, Stack } from "./types";

export function determineStack(answers: IntakeAnswers): Stack {
  if (!answers.needsPersistence) return "static-html";
  if (answers.needsAccounts) return "react-supabase";
  return "react-localstorage";
}

export const STACK_LABELS: Record<Stack, string> = {
  "static-html": "Single HTML file",
  "react-localstorage": "React + local storage",
  "react-supabase": "React + Supabase",
};
