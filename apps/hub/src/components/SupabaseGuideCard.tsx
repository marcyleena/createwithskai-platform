import { useState, type FormEvent } from "react";
import { Button, Input } from "@createwithskai/ui";
import { useCredential } from "../hooks/useCredential";
import { CONNECTION_GUIDES } from "../lib/connectionGuides";
import { GuideCard } from "./GuideCard";

// Unlike ApiKeyGuideCard, Supabase needs two separate credential rows
// (project_url and anon_key) rather than one -- so this saves/loads/removes
// both together instead of reusing the single-value card.
export function SupabaseGuideCard() {
  const guide = CONNECTION_GUIDES.supabase;
  const projectUrlCredential = useCredential("supabase", "project_url");
  const anonKeyCredential = useCredential("supabase", "anon_key");
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = projectUrlCredential.loading || anonKeyCredential.loading;
  const hasBoth = Boolean(projectUrlCredential.credential) && Boolean(anonKeyCredential.credential);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectUrl.trim() || !anonKey.trim()) return;
    setError(null);
    const submittedUrl = projectUrl.trim();
    const submittedKey = anonKey.trim();
    setProjectUrl("");
    setAnonKey("");
    setEditing(false);
    const [urlResult, keyResult] = await Promise.all([
      projectUrlCredential.save({ project_url: submittedUrl }),
      anonKeyCredential.save({ anon_key: submittedKey }),
    ]);
    const saveError = urlResult.error || keyResult.error;
    if (saveError) {
      setError(saveError);
      setProjectUrl(submittedUrl);
      setAnonKey(submittedKey);
      setEditing(true);
    }
  }

  async function handleRemove() {
    setEditing(false);
    await Promise.all([projectUrlCredential.remove(), anonKeyCredential.remove()]);
  }

  return (
    <GuideCard done={hasBoth} loading={loading} guide={guide}>
      {hasBoth && !editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-espresso/50">Project URL and anon key saved.</span>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-espresso/60">Project URL</label>
            <Input
              type="text"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://yourproject.supabase.co"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-espresso/60">Anon key</label>
            <Input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="your anon/public key"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="dark" disabled={!projectUrl.trim() || !anonKey.trim()}>
              Save
            </Button>
            {hasBoth && (
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
