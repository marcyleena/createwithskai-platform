export type Stack = "static-html" | "react-localstorage" | "react-supabase";

export interface GeneratedFile {
  path: string;
  content: string;
}

export type StyleTileId = "clean-minimal" | "bold-vibrant" | "soft-feminine" | "dark-sleek";

// "yes" | "no" | "not_sure" for toggle-type consideration questions, or a
// select option's value (e.g. "subscription", "csv") for select-type ones --
// see ConsiderationQuestion in lib/considerations.ts.
export type ConsiderationAnswer = string;

export interface IntakeAnswers {
  appName: string;
  description: string;
  audience: string;
  styleTile: StyleTileId | null;
  customVibe: string;
  colorInput: string;
  features: string;
  needsAccounts: boolean;
  needsPersistence: boolean;
  usesAI: boolean;
  aiDescription: string;
  specialRequirements: string;
  /** Keyed by the exact question text (dynamic or fixed). */
  considerations: Record<string, ConsiderationAnswer>;
}

export const EMPTY_ANSWERS: IntakeAnswers = {
  appName: "",
  description: "",
  audience: "",
  styleTile: null,
  customVibe: "",
  colorInput: "",
  features: "",
  needsAccounts: false,
  needsPersistence: false,
  usesAI: false,
  aiDescription: "",
  specialRequirements: "",
  considerations: {},
};

// Shape stored in app_builds.config (jsonb) -- see supabase/schema.sql.
export interface BuildConfig {
  answers: IntakeAnswers;
  stack: Stack;
  files: GeneratedFile[];
  repoUrl?: string;
  repoFullName?: string;
  deploymentUrl?: string;
  previewUrl?: string;
}
