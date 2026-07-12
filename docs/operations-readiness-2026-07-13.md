# NUVIO Async Operations and Production Readiness Audit

Audit date: 2026-07-13 KST

## Safety boundary

- Production PostgreSQL was queried only inside a `REPEATABLE READ READ ONLY` transaction.
- The audit verifies `transaction_read_only = on` and aborts otherwise.
- No production row, migration, environment variable, Cron definition, bucket, or deployment was changed.
- No email, SMS, or browser push was sent. Provider tests used development-only mocks and asserted that external `fetch` was never called.
- Output contains aggregate counts, migration filenames, bucket names, deployment metadata, and environment variable names only. It contains no recipient, endpoint, object path, token, key, or secret value.

## Release decision

Release gate: **blocked**.

The source fixes and tests are ready for review, but production still has undelivered work, missing delivery configuration, and no deployed claim-token protection. The production Supabase project is on the Free plan, which does not include guaranteed automatic backups or PITR; an operator-managed logical backup is therefore required before a destructive rollout.

The latest read-only production snapshot completed at `2026-07-12T16:09:38.138Z`. It reported 12 blocking findings: six terminal email failures, two due scheduled messages, two missing migrations, and one missing protection finding for each delivery claim path.

## Blocking findings

### P0: email delivery is not configured and six events are terminally failed

The production environment has database, Supabase, Cron, and VAPID variables, but none of the required email provider variables are present:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- either `RESEND_API_KEY` or the email webhook URL/auth variables

The read-only queue audit found 15 notification events:

| Channel | Status | Count |
| --- | --- | ---: |
| Browser push | Sent | 5 |
| Browser push | Skipped | 4 |
| Email | Failed | 6 |

The six email failures must be reviewed. Do not blindly replay them until provider idempotency and recipient intent are confirmed.

### P0: two scheduled messages are already due with no usable dispatch path

Production has three `scheduled_messages`; all remain `scheduled`, and two are already due. Automatic SMS delivery is not enabled, and production has neither a configured SMS webhook nor all three Google manual-dispatch settings.

The patched worker rejects mock SMS in production, records a stable idempotency key, and retries with bounded exponential backoff. It no longer treats a default mock response as a successful production delivery.

### P1: claim-token and scheduled-message retry migrations are not applied

Production has 165 applied local migrations. The following two branch migrations are not applied:

- `20260713000000_add_async_delivery_claim_columns.sql`
- `20260713001000_enforce_async_delivery_claims.sql`

They are intentionally split for compatible rollout:

1. Apply the additive columns migration while the old worker is still deployed.
2. Deploy the claim-aware worker and the isolated Cron registry.
3. Wait for old invocations to finish, run the read-only audit, then apply the enforcement migration.

The second migration fails before DDL if a processing row lacks claim ownership or scheduled-message state is inconsistent. Neither migration contains cleanup DML.

### P1: current production Cron registry is the old coupled schedule

Vercel reports Cron enabled on the current production deployment with these definitions:

| Path | UTC schedule |
| --- | --- |
| `/api/cron/process-program-reminders` | `0 0 * * *` |
| `/api/cron/process-notifications` | `5 0 * * *` |
| `/api/cron/process-review-requests` | `15 0 * * *` |
| `/api/cron/refresh-announcements` | `0 18 * * *` |

The patched registry replaces the external-announcement refresh with an isolated scheduled-message job and orders the daily queue pipeline as reminder generation, scheduled SMS, review requests, then notification delivery.

The latest production deployment was created after the previous daily Cron window. Available runtime logs contain no authenticated Cron execution for that deployment yet. The four unauthenticated probes correctly returned `401`.

### P1: Free plan has no guaranteed operator-accessible automatic backup

The project owner confirmed that production uses the Supabase Free plan. Supabase pricing lists automatic backups and PITR as unavailable on Free, and the backup guide recommends that Free projects regularly create logical exports with `supabase db dump` and keep them off site. A platform-internal snapshot that might become available after a future plan upgrade is not an operator-accessible or guaranteed recovery point and is not counted as release evidence.

Database and Storage access were verified through the application connection. This workstation has neither `pg_dump` nor Docker, so no production logical export was created during this audit. Before a destructive rollout, create roles, schema, and data dumps from a trusted backup workstation, encrypt and retain them outside the repository, separately export Storage object bytes, and prove a restore into a non-production target. The procedure is in `docs/operations-rollback-runbook.md`.

Official policy references:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/backups

### P1: browser push cannot provide absolute provider-level exactly-once delivery

The patched database claim token prevents two workers from finalizing the same event, and the event ID remains the push `tag`. Registration is protected by a unique endpoint index and per-endpoint/per-user advisory locks.

However, Web Push has no provider idempotency key. A process crash after the push service accepts a request but before the database commit leaves an ambiguous outcome. Automatic replay can duplicate delivery; refusing replay can lose it. The system can guarantee one active worker and bounded processing, but not mathematical exactly-once delivery across that external boundary. Treat this as a documented residual risk or adopt a provider with durable idempotency receipts.

## Verified healthy evidence

- Vercel production deployment `dpl_A2Rdrw6NoisQ9DHdt3gyN2hDZ32p` is `READY`.
- `nuvio.kr`, `www.nuvio.kr`, and the production `vercel.app` alias are verified.
- `/`, `/magazine`, and `/api/programs` returned `200`.
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and Cache-Control were present on all three probes.
- The seven-day Vercel query found zero `5xx` request logs in the available retention window.
- `CRON_SECRET` is configured and all four Cron routes rejected unauthenticated requests with `401`.
- Notification dedupe collisions: 0.
- Stale notification and scheduled-message processing claims: 0.
- Invalid notification terminal states: 0.
- Review requests: 0 rows and 0 outbox/state findings.
- Push subscriptions: 1 row, 0 duplicate endpoints, 0 unsupported endpoints, 0 users over the eight-device limit.
- All six expected Supabase Storage buckets are present and readable through the catalog, with 74 objects in aggregate.

## Source fixes

- Notification claims now receive a database-generated token; finalization requires the matching token and `processing` state.
- Batch claim updates now include `status = 'pending'`, closing the race with immediate browser-push claims.
- In-app delivery uses `notification-event:<event-id>` as its unique dedupe key.
- Missing email configuration enters bounded retry instead of immediate terminal failure.
- Review-request token rotation, request-count increment, and email outbox insertion now share one transaction.
- Scheduled SMS gains attempt counts, claim ownership, provider receipt storage, and bounded retry.
- Email/SMS mock message IDs are stable for a supplied idempotency key.
- Email, SMS, and push mocks are development-only; production mock SMS is rejected.
- Cron substeps use `Promise.allSettled`, report partial failure, and cannot prevent sibling steps from running.
- System health now checks email, SMS/manual dispatch, and browser push readiness.

## Required production configuration before rollout

| Capability | Current state | Required action |
| --- | --- | --- |
| Database and Supabase | Present | Keep values unchanged and rotate only under a separate secret procedure |
| Cron authentication | Present | Keep `CRON_SECRET`; verify first authenticated run after deployment |
| Browser push | Present | Keep VAPID values and monitor expired subscription cleanup |
| Email | Missing | Configure Resend or an idempotent email webhook |
| SMS automatic delivery | Disabled/unconfigured | Keep disabled unless a real webhook is configured |
| SMS manual dispatch | Missing | Configure the Google service account and spreadsheet settings, or explicitly retire this workflow |
| Reviews | Feature variable absent | Confirm that reviews should remain disabled before release |
| Social token encryption | Missing | Configure before enabling social connection persistence |

## Verification commands

```powershell
$env:NUVIO_OPS_ENV_DIR='C:\projects\NUVIO\nuvio-web'
npm.cmd run audit:async-ops -- --fail-on-blocking
npm.cmd run verify:ops-readiness
npm.cmd run test:security
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd drizzle-kit check
npm.cmd run build
```

The release gate opens only after the queue audit has no blocking findings, delivery providers are intentionally configured, both migrations have completed in the documented order, an authenticated Cron run is visible, and either a verified operator-managed logical backup and restore rehearsal is attached or the project has been upgraded and its managed recovery point has been verified.
