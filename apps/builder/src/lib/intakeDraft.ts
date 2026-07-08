const DRAFT_KEY = "builder_intake_draft";

// Generic on purpose -- IntakeWizard owns the actual draft shape (it has
// types, like Step/Section, that are local to that component).
export function loadIntakeDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveIntakeDraft(draft: unknown): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage unavailable or full -- the draft just won't persist.
  }
}

export function clearIntakeDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
