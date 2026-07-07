/// <reference types="vite/client" />
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROOT_DOMAIN, isOnRootDomain } from "./domain";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in this app's .env file."
  );
}

// On the real domain (or any subdomain of it) the auth cookie is scoped to
// `.createwithskai.cloud` so hub, coach, hq, and builder all read/write the
// same session. In local dev there's no shared parent domain, so the cookie
// falls back to a host-only cookie — which Chrome/Firefox happily share
// across ports on `localhost`, so cross-app dev testing still works.
function cookieDomain(): string | undefined {
  return isOnRootDomain() ? `.${ROOT_DOMAIN}` : undefined;
}

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

// Untyped on purpose: see @createwithskai/types for the row shapes to cast
// query results against at the call site (`data as SomeRowType`).
export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    // Same literal name in every app so a stray localStorage-based client
    // (or an older cookie) never gets read as if it were current.
    name: "sb-createwithskai-auth",
    domain: cookieDomain(),
    path: "/",
    sameSite: "lax",
    secure: isSecureContext(),
    maxAge: 60 * 60 * 24 * 365, // 1 year; the refresh token rotates well before this
  },
});
