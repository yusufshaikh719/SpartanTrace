# Feature audit

The supplied backlog repeats several US/FR identifiers. This audit uses workflow names to distinguish the two US06 entries and the duplicate FR numbers.

| Requirement | Implementation and local coverage |
| --- | --- |
| US01: post found item | Shared create/edit validation; photo required; campus dates; server-assigned identity/UUID; persistent Available listing; browser posting and database validation tests. |
| US02: review/respond to claims | Finder sees listing claims with identity, proof, timestamp and status; participant/admin RLS; claim-specific persistent conversations; Pending review before acceptance; one accepted claimant; competing claims rejected atomically. |
| US03: return item | Finder confirms handover of a Claimed listing; timestamp recorded; notification generated; excluded from public results; read-only listing/conversation retained in Finder and claimant histories. |
| US04: update found listing | Finder-only edit of Available/Pending/Claimed records; shared validation, replaceable uploaded/URL photos, and updated timestamp; existing record updated; browser edit and authorization tests. |
| US05/US06: search/filter | Title/description keyword search; individual keyword relevance and newest tie-break; newest sorting; intersecting category/location/date filters; reset; grid/ledger; inclusive campus-calendar date bounds; pagination beyond 1,000 records; mobile viewport coverage. |
| US06: contact Finder | One active claim per Looker/listing; Available items only; ownership evidence required; claim/thread/first message/Finder notification created atomically; persistent participant-only messaging. |
| US07: lost-item alert | At least one keyword/category/location criterion; optional date lost; persisted active alerts; delete; existing and newly published matches. |
| US08: register | Name/email/password form; SJSU restriction in client/database; Supabase sends confirmation; profile created after verification; no local session fabrication. Actual email delivery requires hosted testing. |
| US09: authenticate | Supabase password verification through deployed login gateway; private per-account lockout; five failures/15 minutes; reset on success/expiry; server-side inactivity expiry; suspended identities denied. Transient Auth outages do not count as failed passwords. Reload restoration and client inactivity expiry have browser coverage. Hosted Auth and function environment remain to be tested. |
| US10: notifications | Claim/message/decision/return/removal/match records created server-side; recipient-only reads; persistent read/unread state; related-content navigation; authenticated polling. |
| US11: possible matches | Available, unremoved listings only; any keyword in title/description; all supplied category/location/date criteria; one notification per alert/listing pair; SQL deduplication tests. |
| US12: report review | Listing/message/account reporting with required reason; trusted reporter/owner/content; admin-only queue; context and full-conversation review; reason, admin ID and timestamp recorded on resolution. |
| US13: remove invalid content | Admin-only soft removal; normal reads/search hide removed content; owner notification with reason; preserved identifiers and audit logs; browser moderation and SQL permission tests. |
| US14: manage accounts | Admin-only suspend/restore with required reason; self-suspension prohibited; active app sessions revoked on suspension; fresh login after restoration; immutable audit log. |

## Verification scope

`npm test` runs SQL/RLS/security, login-handler, service-failure, validation and search/date tests. `npm run test:e2e` runs browser workflows against the actual schema using a simulated Supabase Auth/PostgREST transport. `npm run build` validates TypeScript and creates the production bundle. See test files for exact assertions.

No hosted SQL migration or Edge Function has been deployed by this audit. A read-only connection probe found a reachable listings table without `app_version()`, indicating the secure workflow migration was not installed at that time. The next required setup is in [SUPABASE_SETUP.md](SUPABASE_SETUP.md); authenticated hosted workflow verification remains pending.

## Prepared handoff

- `npm run supabase:check` performs the public, non-mutating hosted readiness check. The latest check passed public listing access and email confirmation, and found the workflow migration and login function still missing.
- `npm run supabase:prepare` generates fresh-install SQL, upgrade SQL, a standalone dashboard-ready login function, instructions, and a SHA-256 manifest in `deployment/supabase/`, without credentials.
- `.github/workflows/verify.yml` keeps type checks, database/unit tests, build, package generation, and browser workflows repeatable in CI. The workflow itself has not been run on GitHub from this session.
- Hosted migration/deployment, real verification email delivery, and authenticated hosted workflow checks remain blocked on account-owner access. The deployment package is ready for that remaining owner-managed setup.

## Latest local validation

- 62 automated tests pass, including SQL/RLS workflows, login lease cancellation, logout revocation, pagination, photo validation, connection handling, and deployment-package execution.
- 11 browser scenarios pass, covering posting/editing/uploaded photo replacement, messaging/return/history, reports/moderation/accounts, search/filtering, verification UI, lockout, reload/inactivity, setup errors, and mobile layout.
- TypeScript checks, production build, dependency audit, and whitespace checks pass. The administrator interface loads on demand so ordinary registry visits do not download that code initially.

These are local checks using the documented test adapter. They do not claim that the missing hosted migration or function has been installed.
