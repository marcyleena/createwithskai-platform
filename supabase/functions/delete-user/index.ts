// Supabase Edge Function: delete-user
//
// Deletes the CALLING user's own Supabase Auth account. Invoked from the hub
// dashboard's "Delete Account" flow, after the client has already deleted
// the user's own rows from every user_id-keyed table directly (safe to do
// client-side, since RLS already restricts those deletes to
// auth.uid() = user_id). Only the auth.users row itself needs this function,
// since deleting it requires the Admin API and the service role key, which
// must never reach the browser.
//
// Deploy: supabase functions deploy delete-user
// No extra secrets to set -- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// reserved names Supabase injects automatically into every edge function.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Supabase/Postgrest error messages can embed identifying details -- log
// only the structured code/status, never the raw error object.
function logError(context: string, error: unknown): void {
  if (error && typeof error === "object") {
    const { code, status } = error as { code?: string; status?: number };
    console.error(`delete-user: ${context}`, { code: code ?? null, status: status ?? null });
    return;
  }
  console.error(`delete-user: ${context}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ success: false, error: "Missing bearer token" }, 401);
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("delete-user: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    return jsonResponse({ success: false, error: "Server misconfigured" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller's identity from their own access token -- never trust
  // a client-supplied user id, since that would let anyone delete anyone
  // else's account just by passing a different id in the request body.
  // Passing the token explicitly (rather than relying on a header) verifies
  // it independently of which key created this client.
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return jsonResponse({ success: false, error: "Invalid or expired session" }, 401);
  }

  const userId = userData.user.id;

  try {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      logError("failed to delete auth user", deleteError);
      return jsonResponse({ success: false, error: "Failed to delete account" }, 500);
    }
  } catch (err) {
    logError("unexpected error", err);
    return jsonResponse({ success: false, error: "Unexpected server error" }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
