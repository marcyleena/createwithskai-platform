import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Input } from "@createwithskai/ui";
import { useCredential } from "../../hooks/useCredential";
import { CheckBadge } from "../CheckBadge";

interface OnboardingApiKeyCardProps {
  provider: string;
  label: string;
  description: ReactNode;
  placeholder?: string;
  /** Defaults to "api_key" -- pass a different value for non-API-key credentials (e.g. Vercel's "api_token"). */
  credentialType?: string;
  /** Key inside the jsonb `value` column that holds the actual secret. Defaults to "api_key". */
  valueKey?: string;
}

export function OnboardingApiKeyCard({
  provider,
  label,
  description,
  placeholder,
  credentialType = "api_key",
  valueKey = "api_key",
}: OnboardingApiKeyCardProps) {
  const { credential, loading, save } = useCredential(provider, credentialType);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasKey = Boolean(credential);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError(null);
    const submittedValue = value.trim();
    setValue("");
    const { error: saveError } = await save({ [valueKey]: submittedValue });
    if (saveError) {
      setError(saveError);
      setValue(submittedValue);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-medium text-espresso">{label}</p>
        {!loading && hasKey && <CheckBadge />}
      </div>
      <p className="mb-3 text-sm text-espresso/60">{description}</p>

      {hasKey ? (
        <p className="text-sm text-espresso/50">Saved -- you can update this anytime from your dashboard.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder ?? "Paste your API key"}
            className="sm:flex-1"
          />
          <Button type="submit" variant="dark" disabled={!value.trim()}>
            Save
          </Button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
