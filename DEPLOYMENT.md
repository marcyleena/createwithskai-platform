# Deploying to Vercel (subdomain routing)

This monorepo ships four independently deployable apps that share one Supabase backend.
Because each app needs its own domain (`createwithskai.cloud`, `coach.…`, `hq.…`, `build.…`),
create **four separate Vercel projects from the same GitHub repo**, each pointed at a
different app directory — Vercel does not split subdomains within a single project.

## 1. Create four Vercel projects

For each app, run "Add New Project" in Vercel, import this repo, and set:

| App        | Root Directory   | Domain                          |
|------------|-------------------|----------------------------------|
| `hub`      | `apps/hub`        | `createwithskai.cloud` (+ `www`) |
| `coach`    | `apps/coach`       | `coach.createwithskai.cloud`     |
| `hq`       | `apps/hq`          | `hq.createwithskai.cloud`        |
| `builder`  | `apps/builder`     | `build.createwithskai.cloud`     |

Each app's `vercel.json` (already in its folder) sets:
- `framework: "vite"`
- `buildCommand`: builds only that workspace (`npm run build --workspace=<app>`)
- `installCommand`: `cd ../.. && npm install` — installs from the repo root so npm workspace
  linking between `packages/*` and the app resolves correctly
- `outputDirectory: "dist"`
- SPA rewrite so client-side routes (e.g. `/dashboard`) resolve on refresh

You should not need to override these in the Vercel dashboard — "Root Directory" is the only
per-project setting required.

## 2. Set environment variables

Add these to **all four** Vercel projects (Project Settings → Environment Variables):

```
VITE_SUPABASE_URL=https://gsfejyokuxccpjghlfzb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — see apps/*/.env>
```

## 3. Attach domains

In each project's Settings → Domains, add the matching subdomain from the table above and
follow Vercel's DNS instructions (usually a `CNAME` to `cname.vercel-dns.com`, or an `A`
record for the apex domain on `hub`).

## 4. Apply the Supabase schema

Before going live, run `supabase/schema.sql` against the shared project — see
[`supabase/README.md`](supabase/README.md).
