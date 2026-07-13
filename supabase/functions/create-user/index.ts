// Supabase Edge Function: create-user
//
// Called by n8n after a Stan Store purchase webhook fires. Creates a
// pre-confirmed Supabase auth user (no email verification step needed),
// mirrors it into public.users, and sends them a password-reset email that
// doubles as their welcome email / account-setup link.
//
// Deploy: supabase functions deploy create-user
// Secrets: supabase secrets set WEBHOOK_SECRET=...
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are reserved names Supabase
//   injects automatically into every edge function — see README in this folder.)

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

interface CreateUserPayload {
  email?: string;
  product_name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Supabase/Postgrest error messages can embed the email address that
// triggered them (e.g. "A user with this email address has already been
// registered"). Logging only the structured code/status keeps these logs
// useful for debugging without ever writing the email itself.
function logError(context: string, error: unknown): void {
  if (error && typeof error === "object") {
    const { code, status } = error as { code?: string; status?: number };
    console.error(`create-user: ${context}`, { code: code ?? null, status: status ?? null });
    return;
  }
  console.error(`create-user: ${context}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("create-user: WEBHOOK_SECRET is not configured");
    return jsonResponse({ success: false, error: "Server misconfigured" }, 500);
  }

  if (req.headers.get("x-webhook-secret") !== webhookSecret) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const productName = payload.product_name?.trim();

  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ success: false, error: "A valid `email` is required" }, 400);
  }
  if (!productName) {
    return jsonResponse({ success: false, error: "`product_name` is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("create-user: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    return jsonResponse({ success: false, error: "Server misconfigured" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let userId: string;
    let isNewUser: boolean;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // pre-confirmed — no verification email, can log in immediately
      user_metadata: { product_name: productName },
    });

    if (created?.user) {
      userId = created.user.id;
      isNewUser = true;
    } else if (createError && isAlreadyRegisteredError(createError)) {
      // Already have an account — look up their id without creating a
      // duplicate. `generateLink` requires an existing user for the
      // "recovery" type and returns the full user record; it does not by
      // itself send anything, so no email goes out from this call.
      const { data: existing, error: lookupError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (lookupError || !existing?.user) {
        logError("failed to look up existing user", lookupError);
        return jsonResponse({ success: false, error: "Failed to look up existing user" }, 500);
      }

      userId = existing.user.id;
      isNewUser = false;
    } else {
      logError("createUser failed", createError);
      return jsonResponse(
        { success: false, error: createError?.message ?? "Failed to create user" },
        500
      );
    }

    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert({ id: userId, email }, { onConflict: "id" });

    if (upsertError) {
      logError("failed to upsert public.users row", upsertError);
      return jsonResponse({ success: false, error: "Failed to record user profile" }, 500);
    }

    // Only email brand-new signups — an existing customer re-purchasing
    // shouldn't get another "set your password" email every time.
    if (isNewUser) {
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: "https://createwithskai.cloud/login",
      });
      if (resetError) {
        // The account already exists and is usable at this point — log and
        // continue rather than fail the whole webhook over the email step.
        logError("failed to send password reset email", resetError);
      }
    }

    return jsonResponse({ success: true, user_id: userId }, 200);
  } catch (err) {
    logError("unexpected error", err);
    return jsonResponse({ success: false, error: "Unexpected server error" }, 500);
  }
});

function isAlreadyRegisteredError(error: { message?: string; code?: string }): boolean {
  if (error.code === "email_exists" || error.code === "user_already_exists") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("already been registered") || message.includes("already registered");
}
