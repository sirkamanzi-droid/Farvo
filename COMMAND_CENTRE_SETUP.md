# Omulimi Command Centre setup

The Command Centre is a separate administrator interface at `/command-centre`. The URL is not a security control: every private API request verifies the Supabase access token and compares the authenticated user's immutable Auth UUID with a server-only allowlist value before using the privileged database client.

## Required Vercel environment variables

Keep these server-side. **Do not prefix either value with `VITE_`.**

| Variable | Value |
| --- | --- |
| `OMULIMI_ADMIN_USER_ID` | The UUID of the one authorised administrator in Supabase Authentication → Users |
| `SUPABASE_SERVICE_ROLE_KEY` | The project's legacy service-role key, or use `SUPABASE_SECRET_KEY` with a current secret API key |

The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables are also required. Add the two server-only variables to the Vercel Production environment (and Preview if testing preview deployments), then redeploy.

To find the administrator UUID: open Supabase Dashboard → Authentication → Users, select the intended existing administrator account, and copy its User UID. Set that exact UUID as `OMULIMI_ADMIN_USER_ID`. Do not use an email address or user-editable metadata as the authorization identity.

## First administrator access

1. Confirm the intended administrator already has a normal Omulimi Auth account.
2. Set the two server-only Vercel variables above.
3. Redeploy the application.
4. Open `https://omulimiapp.vercel.app/command-centre` and sign in with that existing account.
5. On first access, scan the displayed TOTP QR code with an authenticator app and enter its current code. Keep the secret private. Later sign-ins require the authenticator code again.
6. A different signed-in farmer account must receive HTTP 403 from every protected Command Centre API view and action.

There is no admin sign-up, admin role field in farmer metadata, or client-side service key. The console also requires TOTP multi-factor authentication: the first authorised sign-in enrolls an authenticator, and subsequent sign-ins require a current one-time code. The server checks the signed JWT's `aal2` claim before any privileged operation.

## Current controls

- Overview: counts for farmer accounts, cooperatives, farms, saved soil assessments, and Kato conversations.
- Farmers: read-only farmer directory (name, farmer code, cooperative and registration date; no email or credential data).
- Cooperatives: activate/deactivate registration access. Deactivation blocks future use of that cooperative's access code; it does not delete or disable existing farmer accounts.
- App settings: publish a short announcement displayed in the signed-in farmer app.
- Audit trail: view administrator changes made through this console.

The audit and settings tables have RLS enabled, no client policies, and no table privileges for `anon` or `authenticated`. Only the server-side privileged key can access them. The API returns only the public announcement from its unauthenticated public-config view.

## Verification boundaries

CI verifies type-checking, existing disease tests, and the production build. The live admin sign-in cannot be completed until the Vercel environment variables are configured and the authorised account UUID is selected. Do not describe the console as live or fully verified before that deployment smoke test.
