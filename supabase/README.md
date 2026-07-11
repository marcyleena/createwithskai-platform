# Supabase schema

Applies to the shared project: `https://gsfejyokuxccpjghlfzb.supabase.co`

## Apply the schema

1. Open the [Supabase SQL editor](https://supabase.com/dashboard/project/gsfejyokuxccpjghlfzb/sql/new) for this project.
2. Paste the contents of `schema.sql` and run it. It is idempotent — safe to re-run after edits.

Or via the Supabase CLI:

```sh
supabase db push --db-url "postgresql://postgres:<password>@db.gsfejyokuxccpjghlfzb.supabase.co:5432/postgres" < supabase/schema.sql
```

## What it creates

- `public.users` — mirrors `auth.users`; a row is auto-created via trigger on signup. Tracks
  `onboarding_completed` so the hub only shows the first-time onboarding wizard once.
- `user_credentials`, `brand_profiles`, `coach_conversations`, `product_builds`, `app_builds`,
  `hq_competitors`, `hq_content_calendar`, `integration_events` — all keyed by `user_id`.
- Row Level Security on every table, scoped to `auth.uid()`, so each user can only read/write
  their own rows across all four apps (hub, coach, hq, builder) since they share one Supabase project.
- `updated_at` is kept current automatically via a shared trigger.
