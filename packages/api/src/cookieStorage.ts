import type { SupportedStorage } from "@supabase/supabase-js";

interface CookieStorageOptions {
  domain?: string;
  secure: boolean;
  maxAgeSeconds: number;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number, options: CookieStorageOptions): void {
  if (typeof document === "undefined") return;
  if (value.length > 3800) {
    // A single cookie tops out around 4KB. Sessions with a lot of linked
    // identities or custom metadata could get here — this is a visible
    // warning rather than a silent truncation/failure.
    console.warn(
      `[supabase] Session cookie "${name}" is ${value.length} bytes, close to the ~4KB browser cookie limit.`
    );
  }
  const parts = [`${name}=${encodeURIComponent(value)}`, "path=/", `max-age=${maxAge}`, "samesite=lax"];
  if (options.domain) parts.push(`domain=${options.domain}`);
  if (options.secure) parts.push("secure");
  document.cookie = parts.join("; ");
}

// A minimal, dependency-free cookie-backed storage adapter for Supabase's
// GoTrueClient, so every step is easy to trace. Deliberately does not use
// @supabase/ssr: that library forces `flowType: "pkce"` and base64url
// chunked encoding unconditionally, which is more moving parts than a
// plain client-side SPA needs — this covers the one thing we actually
// want (session readable from a cookie shared across subdomains) without
// changing the auth flow behavior that already worked before.
export function createCookieStorage(options: CookieStorageOptions): SupportedStorage {
  return {
    getItem: (key) => readCookie(key),
    setItem: (key, value) => writeCookie(key, value, options.maxAgeSeconds, options),
    removeItem: (key) => writeCookie(key, "", 0, options),
  };
}
