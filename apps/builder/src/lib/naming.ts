export function deriveBuildName(summary: string): string {
  const clean = summary.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean || "Untitled app";
}

export function slugifyRepoName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "app"}-${suffix}`;
}
