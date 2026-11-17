# Feature audit

The supplied backlog repeats several US/FR identifiers. This audit uses workflow names to distinguish the two US06 entries and the duplicate FR numbers.

| Requirement | Implementation and local coverage |
| --- | --- |
| US01: post found item | Shared create/edit validation; photo required; campus dates; server-assigned identity/UUID; persistent Available listing; browser posting and database validation tests. |
| US02: review/respond to claims | Finder sees listing claims with identity, proof, timestamp and status; participant/admin RLS; claim-specific persistent conversations; Pending review before acceptance; one accepted claimant; competing claims rejected atomically. |
| US03: return item | Finder confirms handover of a Claimed listing; timestamp recorded; notification generated; excluded from public results; read-only listing/conversation retained in Finder and claimant histories. |
| US04: update found listing | Finder-only edit of Available/Pending/Claimed records; shared validation, replaceable uploaded/URL photos, and updated timestamp; existing record updated; browser edit and authorization tests. |
| US05/US06: search/filter | Title/description keyword search; individual keyword relevance and newest tie-break; newest sorting; intersecting category/location/date filters; recent presets and custom inclusive date bounds (either bound optional); reset and independent filter clearing; grid/ledger; campus-calendar dates; pagination beyond 1,000 records; mobile viewport coverage. |
| US06: contact Finder | One active claim per Looker/listing; Available items only; ownership evidence required; claim/thread/first message/Finder notification created atomically; persistent participant-only messaging. |
| US07: lost-item alert | At least one keyword/category/location criterion; optional date lost; persisted active alerts; delete; existing and newly published matches. |
| US08: register | Name/email/password form; SJSU restriction in client/database; Supabase sends confirmation; profile created after verification; no local session fabrication. Actual email delivery requires hosted testing. |
| US09: authenticate | Supabase password verification through deployed login gateway; private per-account lockout; five failures/15 minutes; reset on success/expiry; server-side inactivity expiry; suspended identities denied. Transient Auth outages do not count as failed passwords. Reload restoration and client inactivity expiry have browser coverage. Hosted password login, gateway grants, lockout, suspension/restoration and logout passed live checks. |
| US10: notifications | Claim/message/decision/return/removal/match records created server-side; recipient-only reads; persistent read/unread state; related-content navigation; authenticated polling. |
| US11: possible matches | Available, unremoved listings only; any keyword in title/description; all supplied category/location/date criteria; one notification per alert/listing pair; SQL deduplication tests. |
| US12: report review | Listing/message/account reporting with required reason; trusted reporter/owner/content; admin-only queue; context and full-conversation review; reason, admin ID and timestamp recorded on resolution. |
| US13: remove invalid content | Admin-only soft removal; normal reads/search hide removed content; owner notification with reason; preserved identifiers and audit logs; browser moderation and SQL permission tests. |
| US14: manage accounts | Admin-only suspend/restore with required reason; self-suspension prohibited; active app sessions revoked on suspension; fresh login after restoration; immutable audit log. |

## Verification scope

`npm test` runs SQL/RLS/security, login-handler, service-failure, validation and search/date tests. `npm run test:e2e` runs browser workflows against the actual schema using a simulated Supabase Auth/PostgREST transport. `npm run build` validates TypeScript and creates the production bundle. See test files for exact assertions.

The secure workflow migration and login Edge Function are deployed to TheSpartanTrace (`cjwyhtgqojkovbyplwmx`). Seventeen authenticated hosted workflow assertions passed using four temporary, administratively confirmed test accounts. All test accounts and application/private test records were removed afterward. The local Auth callback URLs and server password minimum have also been applied and verified. Real verification-email delivery remains untested.

## Prepared handoff

- `npm run supabase:check` performs the public, non-mutating hosted readiness check. All four checks now pass for both `http://localhost:5173` and `http://127.0.0.1:5173`.
- `npm run supabase:prepare` generates fresh-install SQL, upgrade SQL, a standalone dashboard-ready login function, instructions, and a SHA-256 manifest in `deployment/supabase/`, without credentials.
- `.github/workflows/verify.yml` keeps type checks, database/unit tests, build, package generation, and browser workflows repeatable in CI. The workflow itself has not been run on GitHub from this session.
- Hosted migration/deployment, Auth configuration, and authenticated workflow smoke checks are complete. The initial HTTP 403 on Auth configuration was resolved after the user's Owner access became available. Real SJSU registration, verification-email delivery and confirmation navigation remain to be checked using an inbox.

## Latest local validation

- 64 automated tests pass, including SQL/RLS workflows, UUID-schema upgrade compatibility with preserved records/foreign keys, login lease cancellation, logout revocation, pagination, photo validation, connection handling, and deployment-package execution.
- 13 browser scenarios pass, covering posting/editing/uploaded photo replacement, messaging/return/history, reports/moderation/accounts, search/filtering, verification UI, lockout, reload/inactivity, setup errors, mobile layout, custom date bounds, and unsent chat isolation between accounts.
- TypeScript checks, production build, dependency audit, and whitespace checks pass. The administrator interface loads on demand so ordinary registry visits do not download that code initially.

These local checks use the documented test adapter. The separate live checks and their limits are recorded below.

## Review rerun: November 17, 2026

Reviewed the supplied high-level stories and the detailed functional specifications, then ran a clean dependency installation, TypeScript checks, all 62 unit/database tests, all 13 browser scenarios, the production build, deployment-package generation, and whitespace checks. The clean install reported zero dependency vulnerabilities.

This review corrected three frontend gaps:

- Added custom start/end dates so searches can narrow older records, with inclusive bounds, optional individual bounds, reversed-range feedback, and independent clearing. The control now correctly says Date Found.
- Cleared unsent message text and chat UI state when the account or conversation changes, preventing ownership details from carrying into another chat or signed-in account.
- Preserved full alert location labels so library floors and the Student Union food court can be distinguished.

Before CLI access was available, the read-only hosted probe returned:

| Check | Result |
| --- | --- |
| Required `app_version()` workflow API | HTTP 404; required secure schema is not ready |
| Public listing projection | HTTP 200 |
| Email registration and confirmation settings | HTTP 200; both enabled |
| Required `login` Edge Function | HTTP 404; not deployed |

At that stage, missing schema readiness prevented registration and protected workflows in this frontend, and the missing function prevented application sign-in. Deployment became possible after the user authenticated the Supabase CLI; the follow-up below supersedes those initial deployment blockers.

## Hosted deployment and verification: November 17, 2026

The initial hosted installation used UUID columns rather than the text identifier columns in the repository's original schema. The first upgrade failed inside its transaction and rolled back. Both installation scripts now normalize UUID application columns to text while preserving identifiers, defaults, foreign keys and existing rows, replacing legacy UUID-dependent policies before conversion. Two new regression tests exercise both SQL installation paths against populated UUID tables, verify retained relationships and messages, repeat installation, and execute authenticated edits/messages afterward.

The corrected migration was applied successfully, and `login` was deployed using server-side bundling with JWT verification disabled for this pre-login endpoint. Both local browser origins pass all four public readiness checks. The user confirmed that the frontend is used locally only.

Live tests used real hosted Auth, the deployed Edge Function, PostgREST, PostgreSQL workflow functions and RLS. Seventeen assertions passed across profile creation and trusted roles; password login and session grants; posting and public visibility; alert matching; editing and authorization; claims/conversations and participant privacy; messaging/notifications; acceptance/return/history; read-only returned conversations; report review/resolution; content removal/notifications/audits; suspension/restoration; logout revocation; and five-attempt lockout. No verification emails were sent: the four synthetic test accounts were administratively confirmed. Cleanup succeeded, and a subsequent independent query found zero Auth users and zero records in all nine application tables, matching the initial empty installation.

**Auth configuration completed:** the initial update was rejected with HTTP 403. After the user confirmed Owner access, the same reviewed update succeeded. Hosted Auth now matches `supabase/config.toml`: Site URL `http://localhost:5173`, callback allowances for both local origins and their paths, and minimum password length 8. Email confirmation remains enabled. A subsequent configuration comparison found no outstanding declared-setting differences, and all four public readiness checks passed. Real SJSU registration, email delivery and confirmation navigation still need inbox verification.

The deployment package was regenerated with the UUID-compatible scripts. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for repeatable setup and remaining checks.
