import type { IntakeAnswers, Stack } from "./types";

const NEGATIVE = /\b(no|nope|nah|not really|don't|do not|none|never ?mind|not needed|unnecessary)\b/i;
const POSITIVE = /\b(yes|yeah|yep|yup|sure|need|require|definitely|please|should|of course)\b/i;

// The last two intake answers are effectively yes/no questions in free text.
// Ambiguous or empty answers default to "no" -- the simpler stack.
export function isAffirmative(answer: string): boolean {
  const normalized = answer.trim();
  if (!normalized) return false;
  if (NEGATIVE.test(normalized)) return false;
  return POSITIVE.test(normalized);
}

export function determineStack(answers: IntakeAnswers): Stack {
  const needsPersistence = isAffirmative(answers.needsPersistence);
  const needsAccounts = isAffirmative(answers.needsAccounts);
  if (!needsPersistence) return "static-html";
  if (needsAccounts) return "react-supabase";
  return "react-localstorage";
}

export const STACK_LABELS: Record<Stack, string> = {
  "static-html": "Single HTML file",
  "react-localstorage": "React + local storage",
  "react-supabase": "React + Supabase",
};
