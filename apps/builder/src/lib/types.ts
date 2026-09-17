import type { UploadedAsset } from "./assets";

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
  /** Uploaded during intake -- see components/IntakeWizard.tsx's assets step. */
  assets: UploadedAsset[];
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
  assets: [],
};

// Shape stored in app_builds.config (jsonb) -- see supabase/schema.sql.
export interface BuildConfig {
  answers: IntakeAnswers;
  stack: Stack;
  // A plain object keyed by file path, not GeneratedFile[] -- see
  // lib/fileStorage.ts for the conversion to/from the array shape used
  // everywhere else in the app (previewBuilder, anthropic.ts, deployClient).
  // filesFromRecord() there also still accepts the array shape, for builds
  // saved before this format existed.
  files: Record<string, string>;
  // The build's current/live asset set -- starts as a copy of
  // answers.assets at generation time, then diverges as assets are added or
  // removed post-generation (answers.assets stays a historical record of
  // what was uploaded during intake). Restored on "Continue editing" the
  // same way files is.
  assets?: UploadedAsset[];
  repoUrl?: string;
  repoFullName?: string;
  deploymentUrl?: string;
  previewUrl?: string;
}
