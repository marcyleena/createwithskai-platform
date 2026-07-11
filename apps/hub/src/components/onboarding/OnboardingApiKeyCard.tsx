import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Input } from "@createwithskai/ui";
import { useCredential } from "../../hooks/useCredential";
import { CheckBadge } from "../CheckBadge";

interface OnboardingApiKeyCardProps {
  provider: string;
  label: string;
  description: ReactNode;
}

export function OnboardingApiKeyCard({ provider, label, description }: OnboardingApiKeyCardProps) {
  const { credential, loading, save } = useCredential(provider);
  const [value, setValue] = useState("");
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
            placeholder="Paste your API key"
            className="sm:flex-1"
          />
          <Button type="submit" variant="dark" disabled={saving || !value.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
