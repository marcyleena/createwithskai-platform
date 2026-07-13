# delete-user edge function

Deletes the calling user's own Supabase Auth account. Called from the hub
dashboard's "Delete Account" flow, after the client has already deleted the
user's own rows from every `user_id`-keyed table directly (safe client-side,
since RLS already restricts those deletes to `auth.uid() = user_id`). Only
removing the `auth.users` row itself needs this function, since that
requires the Admin API and the service role key, which must never reach the
browser.

## Deploy

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in
and linked to this project.

```sh
supabase login
supabase link --project-ref gsfejyokuxccpjghlfzb
supabase functions deploy delete-user
```

No secrets to set — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
reserved names Supabase injects into every edge function automatically.

Once deployed, the function is reachable at:

```
https://gsfejyokuxccpjghlfzb.supabase.co/functions/v1/delete-user
```

## Calling it from the client

Send the signed-in user's own access token as a bearer token — the function
verifies it server-side and only ever deletes the account that token belongs
to:

```ts
const {
  data: { session },
} = await supabase.auth.getSession();

const res = await fetch(
  "https://gsfejyokuxccpjghlfzb.supabase.co/functions/v1/delete-user",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token}` },
  }
);
```

Returns `200` with `{ "success": true }` on success, or a non-200 status with
`{ "success": false, "error": "..." }` otherwise.
