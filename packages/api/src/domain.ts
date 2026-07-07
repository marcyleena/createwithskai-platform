export const ROOT_DOMAIN = "createwithskai.cloud";

// Hub's local dev server (see .claude/launch.json) — used as the sign-in
// destination when running locally, where there's no shared parent domain.
const HUB_DEV_ORIGIN = "http://localhost:5173";

export function isOnRootDomain(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
}

export function getHubOrigin(): string {
  if (typeof window !== "undefined" && isOnRootDomain()) {
    return `${window.location.protocol}//${ROOT_DOMAIN}`;
  }
  return HUB_DEV_ORIGIN;
}
