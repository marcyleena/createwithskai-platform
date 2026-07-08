import type { IntakeAnswers } from "./types";

export function deriveBuildName(description: string): string {
  const clean = description.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean || "Untitled app";
}

// Uses the name the user typed, or suggests one from the description when
// they left it blank (see the "No name yet?" note on the name field).
export function resolveAppName(answers: IntakeAnswers): string {
  return answers.appName.trim() || deriveBuildName(answers.description);
}

export function slugifyRepoName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "app"}-${suffix}`;
}
