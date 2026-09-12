export interface SupabaseCardDraft {
  projectUrl: string;
  anonKey: string;
}

const DRAFT_KEY = "supabase_card_draft";

// Same pattern as apps/builder's intakeDraft.ts: switching tabs to copy a
// value (e.g. the anon key) shouldn't lose whatever was already typed into
// the other field, so every keystroke is persisted here and restored on
// mount -- cleared only once both credentials are actually saved, or the
// user explicitly clears the form.
export function loadSupabaseCardDraft(): SupabaseCardDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SupabaseCardDraft) : null;
  } catch {
    return null;
  }
}

export function saveSupabaseCardDraft(draft: SupabaseCardDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage unavailable or full -- the draft just won't persist.
  }
}

export function clearSupabaseCardDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
