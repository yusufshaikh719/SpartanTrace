# SpartanTrace

SJSU lost-and-found application built with React, TypeScript, Tailwind, and Supabase. Supabase is the source of truth for every workflow. Browser storage holds connection settings and the Supabase Auth session; it does not substitute for a failed database write or authenticate local accounts.

## Run

Use Node.js 24 or newer (CI uses Node.js 24).

```sh
npm install
cp .env.example .env
# Set the public Supabase project URL and publishable/anon key in .env.
npm run dev
```

Check public hosted readiness without creating accounts or changing data:

```sh
npm run supabase:check
# For a deployed frontend:
npm run supabase:check -- --origin https://YOUR_APP_HOST
```

Prepare a deployment package for the dashboard editor without account access:

```sh
npm run supabase:prepare
```

This creates `deployment/supabase/` with fresh-install SQL, upgrade SQL, a standalone login function, instructions, and a SHA-256 manifest. It contains no `.env` or API keys.

Database, email verification, and login-function deployment instructions are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). An unconfigured app displays setup guidance. It does not create demonstration accounts or save campus data locally.

## Workflows

- Finders post a required photo, title, description, category, campus location, and valid date; edit active listings; review claims; accept one claimant; and confirm a completed return.
- Lookers search titles/descriptions, combine category/location/date filters, sort by relevance or newest, submit ownership evidence, and communicate in a claim-specific conversation.
- Lost-item alerts support keywords, optional category/location/date lost, and persistent matching notifications. A listing must match each supplied category/location/date criterion and at least one keyword when keywords are supplied.
- My listings and My claims retain returned-item history. Returned records and conversations are read-only. Removed content is unavailable to normal users.
- Registration requires a name, SJSU email, password, and email confirmation. Login requires verified credentials and an active account. Inactive sessions expire after 30 minutes. Five failed application login attempts within 15 minutes lock the account for 15 minutes.
- In-app notifications cover new claims, messages, claim decisions, alert matches, returns, and content removal. Messages and notifications refresh through authenticated polling.
- Users report listings, individual messages, and Finder accounts. Administrators review report evidence and associated conversations, resolve reports with a reason, remove content, suspend/restore accounts, and inspect an immutable audit log.

Permissions, transitions, matching, notifications, moderation, and audit writes are enforced in PostgreSQL. Multi-record workflows execute in one transaction. User IDs, names, and administrator privileges are never trusted from form data.

## Verify

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The database tests execute the SQL schema, migrations, RLS policies, and transactional workflows in PGlite (a PostgreSQL engine). Browser tests run the actual React app and SQL through a test adapter that simulates Supabase Auth and PostgREST transport. They never modify the configured hosted project. These tests do not prove real email delivery, hosted Supabase Auth behavior, deployed Edge Function configuration, or production hosting. Those checks require the project setup in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

The GitHub Actions verification workflow runs type checks, database/unit tests, the build, deployment-package generation, and browser scenarios without hosted credentials.

See [FEATURE_AUDIT.md](FEATURE_AUDIT.md) for requirement coverage and remaining hosted verification.
