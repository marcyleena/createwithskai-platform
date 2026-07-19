# create-user edge function

Called by n8n right after the Stan Store purchase webhook fires. Creates a
pre-confirmed Supabase auth user (no email verification step), mirrors it
into `public.users`, and — for brand-new signups only — sends a password
reset email that doubles as their welcome / account-setup link.

## Deploy

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in
and linked to this project.

```sh
supabase login
supabase link --project-ref gsfejyokuxccpjghlfzb
supabase functions deploy create-user --no-verify-jwt
```

`--no-verify-jwt` is required, not optional. By default Supabase's platform
gateway requires every edge function request to carry a valid `Authorization`
JWT and rejects anything else with `"Missing authorization header"` *before*
this function's own code ever runs. n8n is calling this function
server-to-server with only the custom `x-webhook-secret` header below (see
the n8n config -- `Authentication: None`, no `Authorization` header at all),
so without `--no-verify-jwt` every call 401s at the gateway regardless of
whether the webhook secret is correct. If this function is ever redeployed
without that flag (e.g. via `supabase functions deploy` with no arguments,
which redeploys everything), n8n calls will start failing again.

## Set environment variables

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reserved names Supabase
injects into every edge function automatically — do not set them yourself.
The only secret you need to set is `WEBHOOK_SECRET`, which must match the
header n8n sends:

```sh
supabase secrets set WEBHOOK_SECRET=<a long random string>
```

Generate a good secret with `openssl rand -hex 32` and store it in your n8n
credentials (see below) — it never needs to be shared anywhere else.

Once deployed, the function is reachable at:

```
https://gsfejyokuxccpjghlfzb.supabase.co/functions/v1/create-user
```

## n8n workflow configuration

After the **Stan Store webhook trigger** node, add an **HTTP Request** node:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://gsfejyokuxccpjghlfzb.supabase.co/functions/v1/create-user` |
| Authentication | None (auth is via the custom header below) |
| Send Headers | On |
| Header 1 | `Content-Type: application/json` |
| Header 2 | `x-webhook-secret: {{ the same value you set with supabase secrets set }}` |
| Send Body | On |
| Body Content Type | JSON |
| Body | `{ "email": "{{ $json.email }}", "product_name": "{{ $json.product_name }}" }` |

Notes:
- Map `email` / `product_name` to whatever fields the Stan Store webhook
  trigger actually outputs for the customer's email and the purchased
  product name — check the trigger node's output panel for the exact key
  names before wiring the expressions above.
- Store the webhook secret value in an n8n **credential** (or environment
  variable referenced via `{{ $env.WEBHOOK_SECRET }}`) rather than pasting it
  directly into the header field, so it isn't visible in exported workflows.
- The function returns `200` with `{ "success": true, "user_id": "..." }` on
  success (including the "already exists" case), and a non-200 status with
  `{ "success": false, "error": "..." }` otherwise — you can branch on the
  HTTP status in n8n (e.g. an IF node checking the response status) to alert
  on failures.
- A `401` with `"error": "Missing x-webhook-secret header"` means the header
  itself never arrived (check the HTTP Request node's headers, or that
  `--no-verify-jwt` is actually deployed -- see above). `"Incorrect
  x-webhook-secret"` means the header arrived but its value doesn't match
  what `supabase secrets set WEBHOOK_SECRET=...` was set to.
