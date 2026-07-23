import { useState, type FormEvent } from "react";
import { Button, Input } from "@createwithskai/ui";
import { useCredential } from "../hooks/useCredential";
import { CONNECTION_GUIDES } from "../lib/connectionGuides";
import { GuideCard } from "./GuideCard";

interface ApiKeyGuideCardProps {
  provider: string;
  /** Defaults to "api_key" -- pass a different value for non-API-key credentials (e.g. Vercel's "api_token"). */
  credentialType?: string;
  /** Key inside the jsonb `value` column that holds the actual secret. Defaults to "api_key". */
  valueKey?: string;
  placeholder?: string;
}

export function ApiKeyGuideCard({
  provider,
  credentialType = "api_key",
  valueKey = "api_key",
  placeholder,
}: ApiKeyGuideCardProps) {
  const guide = CONNECTION_GUIDES[provider];
  const { credential, loading, save, remove } = useCredential(provider, credentialType);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasKey = Boolean(credential);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError(null);
    const submittedValue = value.trim();
    setValue("");
    setEditing(false);
    const { error: saveError } = await save({ [valueKey]: submittedValue });
    if (saveError) {
      setError(saveError);
      setValue(submittedValue);
      setEditing(true);
    }
  }

  async function handleRemove() {
    setEditing(false);
    await remove();
  }

  return (
    <GuideCard done={hasKey} loading={loading} guide={guide}>
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
            className="text-sm font-medium text-espresso/50 underline underline-offset-4"
            onClick={handleRemove}
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
            <Button type="submit" variant="dark" disabled={!value.trim()}>
              Save
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
    </GuideCard>
  );
}
