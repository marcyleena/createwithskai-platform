import { useState, type FormEvent } from "react";
import { Button, Input } from "@createwithskai/ui";
import { useCredential } from "../hooks/useCredential";

interface ApiKeyFieldProps {
  provider: string;
  label: string;
  description: string;
  placeholder?: string;
}

export function ApiKeyField({ provider, label, description, placeholder }: ApiKeyFieldProps) {
  const { credential, loading, save, remove } = useCredential(provider);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasKey = Boolean(credential);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await save({ api_key: value.trim() });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setValue("");
    setEditing(false);
  }

  async function handleRemove() {
    setSaving(true);
    await remove();
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-taupe/40 bg-white/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium text-espresso">{label}</p>
        {!loading && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              hasKey ? "bg-accent-pink/15 text-accent-pink" : "bg-taupe/30 text-espresso/60"
            }`}
          >
            {hasKey ? "Saved" : "Not set"}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-espresso/60">{description}</p>

      {hasKey && !editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-espresso/50">•••••••••••••••• </span>
          <button
            type="button"
            className="text-sm font-medium text-accent-pink underline underline-offset-4"
            onClick={() => setEditing(true)}
          >
            Replace
          </button>
          <button
            type="button"
            className="text-sm font-medium text-espresso/50 underline underline-offset-4 disabled:opacity-50"
            onClick={handleRemove}
            disabled={saving}
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder ?? "Paste your API key"}
            className="sm:flex-1"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="dark" disabled={saving || !value.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {hasKey && (
              <Button type="button" variant="dark" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
