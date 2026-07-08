export type Stack = "static-html" | "react-localstorage" | "react-supabase";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface IntakeAnswers {
  summary: string;
  audience: string;
  needsAccounts: string;
  needsPersistence: string;
}

// Shape stored in app_builds.config (jsonb) -- see supabase/schema.sql.
export interface BuildConfig {
  answers: IntakeAnswers;
  stack: Stack;
  files: GeneratedFile[];
  repoUrl?: string;
  repoFullName?: string;
  deploymentUrl?: string;
}
