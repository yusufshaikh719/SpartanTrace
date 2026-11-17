# Supabase setup

## Deployment preparation without dashboard access

Run `npm run supabase:prepare` to build `deployment/supabase/`. The package contains both SQL installation options and a single `login.ts` file that can be pasted into the dashboard's Edge Function editor without resolving local imports. It excludes `.env` and all credentials. `manifest.json` records source-file SHA-256 hashes for review.

When dashboard access is available, run the appropriate SQL file, create an Edge Function named `login`, paste the generated `login.ts` into its editor, disable its Verify JWT setting, and deploy. The CLI alternative below remains available.

Run `npm run supabase:check` any time to inspect the project specified by `.env`. This checks public listing access, workflow version, email confirmation, and the deployed login function's response/CORS for `http://localhost:5173`. To check another frontend origin, pass `-- --origin https://YOUR_APP_HOST`. It does not register users, send email, attempt a real password, or modify database records. A successful public check does not replace the authenticated hosted verification at the end of this guide.

## 1. Apply the database

For a new project, run all of `supabase/schema.sql` in the Supabase SQL Editor. The script creates the tables and secure workflow API in one transaction and can be run again.

For a project that already ran the original SpartanTrace schema, run `supabase/migrations/202611170001_secure_workflows.sql`. This preserves records, replaces the original permissive policies, and adds the new workflow functions. If the script reports duplicate active claims or multiple conversations per claim, review and resolve those records before rerunning; the migration intentionally does not delete historical records to satisfy its indexes. Existing local-storage data is not migrated or treated as an authenticated identity. Legacy profile IDs are not Supabase Auth identities.

Some earlier hosted installations use UUID application columns. Both SQL scripts convert these to the application's text identifier representation while retaining their values, defaults, and foreign keys. The upgrade does not delete records or cascade schema changes into unrelated tables. Back up populated projects before applying schema changes.

With Supabase CLI 3.x, authenticated management access can apply the existing-installation upgrade directly without a separate database password:

```sh
npx supabase login
npx supabase db query --remote=YOUR_PROJECT_REF --file supabase/migrations/202611170001_secure_workflows.sql --yes
```

The application requires schema version 2. The connection check calls `app_version()` to verify the migration exists.

## 2. Configure Auth

In Authentication settings:

1. Enable the Email provider and **Confirm email**.
2. Set the minimum password length to at least 8.
3. Set the Site URL to the deployed application origin, and allow its callback URL. For development, allow `http://localhost:5173` and/or `http://127.0.0.1:5173`.
4. Configure email delivery for the intended users and test confirmation links with a real SJSU inbox. Supabase's default email service has delivery restrictions; configure custom SMTP for users outside your project team.

The repository declares local-development Auth settings in `supabase/config.toml`. After reviewing the exact changes, an account with Auth configuration privileges can apply them with:

```sh
npx supabase config diff --remote=YOUR_PROJECT_REF
npx supabase config push --remote=YOUR_PROJECT_REF --yes
```

Replace local URLs before using this config for a hosted frontend. The current project's database migration, login function and local Auth settings have been applied. The initial Auth update received HTTP 403, then succeeded once Owner access was available. Hosted configuration now matches the declared local URLs, requires email confirmation and enforces an eight-character password minimum. Sign-in/workflow tests passed; real confirmation email delivery and callback navigation remain unverified.

The database rejects non-SJSU Auth users and creates application profiles only after email confirmation. Names come from `full_name` registration metadata; administrator roles never do.

Do not enable the paid Password Verification Attempt hook for this implementation. The application uses the login gateway below so lockout works on the free tier. [Supabase documents which Auth hooks require paid plans](https://supabase.com/docs/guides/auth/auth-hooks).

## 3. Deploy the login Edge Function

From the repository, with the Supabase CLI authenticated:

```sh
npx supabase functions deploy login --remote=YOUR_PROJECT_REF --no-verify-jwt --use-api --yes
# Only when adding a deployed frontend (keep the origins you actually use):
npx supabase secrets set APP_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://YOUR_APP_HOST --remote=YOUR_PROJECT_REF --yes
```

`APP_ORIGINS` is a comma-separated list of exact browser origins. Keep only the origins you use. The hosted function uses the built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment variables. No server key belongs in the frontend or a `VITE_` variable.

The function is intentionally callable before login. It validates input, obtains a serialized per-account attempt, asks Supabase Auth to verify the password, and uses a service-only function to grant the resulting Auth session access to app data. Failed attempts and lockout state live in a private database schema. An Auth token obtained outside the gateway cannot create a new application session or access protected app data. Public active listings remain browsable without signing in.

A network failure during an attempt can leave a lease for up to 60 seconds; retry after it expires. Temporary Auth outages and rate limits release the attempt without counting as wrong passwords. Attempts abandoned by a terminated function still count toward lockout when their lease expires. The client sends only user activity to renew the application session; background notification/chat polling does not renew it. Logout explicitly revokes the current application session before Supabase sign-out. Suspension ends all granted app sessions, so restoration requires another login.

## 4. Connect the frontend

Set `.env` (or your frontend host's build environment):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Restart Vite after changing `.env`, or rebuild/redeploy the frontend when changing hosting settings. The Database connection button can also save public connection settings for the current browser; a successful save reloads the app. Clear browser overrides to use environment settings.

Only public publishable keys (`sb_publishable_...`) and legacy anon JWTs are accepted. Service-role and secret keys are rejected by the configuration UI.

## 5. Create the first administrator

Register and verify the intended SJSU account, then run this in the SQL Editor as the project owner:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'YOUR_ADMIN@sjsu.edu';
```

Sign in again. The account menu now includes Admin Panel. Administrator access is enforced by database identity, not an email naming convention.

## 6. Verify the hosted project

Use two verified SJSU accounts and one administrator:

1. Register, receive a real verification email, follow the link, and sign in. Verify an incorrect password fails and the fifth failed attempt locks the account.
2. In separate browsers, create a lost-item alert, publish a matching found item with an uploaded photo, and check the alert notification.
3. Submit a claim, exchange messages, set the listing to Pending, accept one claimant, and confirm return. Reload each browser and verify the records persist in the correct history views.
4. Verify another account cannot read the claim or messages. Confirm the Returned item leaves public search and cannot be edited.
5. Report a listing and message. As administrator, review/resolve reports, remove content, and verify owner notifications and audit records. Suspend an already logged-in user, verify writes fail, restore the account, and sign in again.
6. Leave a signed-in browser inactive for 30 minutes, then verify protected actions require login again. Confirm ordinary chat/notification polling did not extend the session.
7. Verify deployed callbacks, browser origins, image uploads, filters, read/unread state, and reload behavior from the real frontend URL.

The local test suite covers SQL and browser workflows, but hosted Auth, email delivery, function secrets/origins, and deployment must be checked here.
