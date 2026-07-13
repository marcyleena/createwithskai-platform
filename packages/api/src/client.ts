/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ROOT_DOMAIN, isOnRootDomain } from "./domain";
import { createCookieStorage } from "./cookieStorage";

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

// Same literal key in every app so all four read/write the same cookie.
const STORAGE_KEY = "sb-createwithskai-auth";

// Exposed for call sites that need to hit an edge function via a plain
// fetch() instead of supabase.functions.invoke() -- see delete-user's caller
// for why.
export const SUPABASE_URL = supabaseUrl;

// Untyped on purpose: see @createwithskai/types for the row shapes to cast
// query results against at the call site (`data as SomeRowType`).
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: STORAGE_KEY,
    storage: createCookieStorage({
      domain: cookieDomain(),
      secure: isSecureContext(),
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year; the refresh token rotates well before this
    }),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
