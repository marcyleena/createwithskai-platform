import { useState } from "react";
import { useAuth } from "@createwithskai/auth";
import { supabase, SUPABASE_URL } from "@createwithskai/api";
import { Button, Card } from "@createwithskai/ui";

// Every user_id-keyed table across all four apps. Deleting these directly
// from the client is safe -- each table's RLS policy already restricts
// deletes to auth.uid() = user_id, so this can never touch another user's
// rows. Only removing the auth.users row itself needs elevated privileges
// (see supabase/functions/delete-user), since that requires the Admin API
// and the service role key.
const USER_KEYED_TABLES = [
  "user_credentials",
  "brand_profiles",
  "coach_conversations",
  "product_builds",
  "app_builds",
  "hq_competitors",
  "hq_content_calendar",
  "integration_events",
];

export function DeleteAccountSection() {
  const { user, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!user) return;
    setDeleting(true);
    setError(null);

    const deleteResults = await Promise.all(
      USER_KEYED_TABLES.map((table) => supabase.from(table).delete().eq("user_id", user.id))
    );
    const tableError = deleteResults.find((r) => r.error)?.error;
    if (tableError) {
      setDeleting(false);
      setError(`Could not delete all of your data: ${tableError.message}`);
      return;
    }

    // Plain fetch rather than supabase.functions.invoke() -- invoke() did not
    // reliably forward this client's session token to the function in
    // testing, which the edge function needs to verify which account it's
    // allowed to delete.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setDeleting(false);
      setError("Your session has expired. Please sign in again and retry.");
      return;
    }

    let functionOk = false;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => null);
      functionOk = res.ok && Boolean(body?.success);
    } catch {
      functionOk = false;
    }

    if (!functionOk) {
      setDeleting(false);
      setError("Your data was removed, but we couldn't delete your account. Please contact support.");
      return;
    }

    await signOut();
    window.location.href = "https://createwithskai.cloud";
  }

  return (
    <section className="mt-16 rounded-2xl border border-red-200 bg-red-50/40 p-5">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-red-700">Danger zone</h3>
      <p className="mb-4 text-sm text-espresso/70">
        Permanently delete your account and all of your data across every Launchpad tool.
      </p>
      <Button
        variant="outline"
        className="!border-red-600 !text-red-600 hover:!bg-red-600 hover:!text-white"
        onClick={() => setShowConfirm(true)}
      >
        Delete Account
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-6">
          <Card className="w-full max-w-md">
            <h3 className="mb-2 text-lg font-bold text-espresso">Delete your account?</h3>
            <p className="mb-5 text-sm text-espresso/70">
              This is permanent. It will delete your account and all of your data -- API keys, brand
              profile, Coach conversations, Creator HQ data, and App Builder projects -- across every
              Launchpad tool. This cannot be undone.
            </p>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                className="!bg-red-600 hover:!bg-red-700"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
