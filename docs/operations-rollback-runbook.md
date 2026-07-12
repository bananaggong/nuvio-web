# NUVIO Operations Rollout and Rollback Runbook

This runbook is a procedure, not a record that production changes were applied.

## Before rollout

1. Authenticate the Supabase CLI with an operator account that can read backup metadata.
2. Run `supabase backups list --project-ref <project-ref>` and archive only the backup timestamp/status, never access tokens or connection strings.
3. Restore the selected backup into a non-production Supabase project and run the application smoke suite against it.
4. Run the production read-only queue audit and confirm there are no processing rows.
5. Configure email and exactly one SMS path. Keep automatic SMS disabled while manual dispatch is the chosen workflow.
6. Record the current Vercel production deployment ID and one known-good previous deployment ID.

## Three-phase database and application rollout

### Phase 1: additive schema

Apply `20260713000000_add_async_delivery_claim_columns.sql`.

- The migration adds nullable claim fields and scheduled-message retry metadata.
- It is compatible with the previous worker.
- It contains no queue cleanup or status changes.

Rerun the read-only audit and confirm the new columns exist.

### Phase 2: application deployment

Deploy the claim-aware application and verify:

- the deployment is `READY`;
- the production domains point to it;
- all four Cron paths appear under `vercel crons ls --format json`;
- unauthenticated Cron requests return `401`;
- the first authenticated Cron invocation appears in runtime logs;
- no `5xx` or stale processing claim appears.

### Phase 3: enforcement

After all previous-version invocations have exited, apply `20260713001000_enforce_async_delivery_claims.sql`.

The migration must abort if any processing row lacks a claim token. Do not edit the preflight or reset a processing row merely to make the migration pass. Investigate the owning invocation and wait for the stale timeout or perform a reviewed recovery.

## Vercel rollback

Use the deployment recorded before Phase 2:

```powershell
npx.cmd --yes vercel@latest rollback <known-good-deployment-id> --yes --scope bananaggongs-projects
```

Then verify `nuvio.kr`, security headers, API smoke, and Cron definitions. A Vercel rollback does not roll back database migrations.

The Phase 1 columns are additive, so the preferred rollback is to restore the previous application and leave the unused columns in place. Do not immediately drop them. Schedule a separate reviewed migration only after confirming no code or queued row depends on them.

## Queue recovery

- Never change a `sent` row back to `pending` without checking the provider receipt and idempotency behavior.
- For email/SMS rows with a stable idempotency key, confirm the provider has no accepted delivery before manual replay.
- For browser push, an interrupted network request can have an unknown outcome. Do not automatically replay an ambiguous attempt.
- Requeue terminal failures only by an operator-reviewed script that records the reason, previous status, attempt count, and provider evidence.
- Never expose recipient addresses, phone numbers, push endpoints, or message bodies in tickets or logs.

## Database restore

A production restore is a last resort and requires an incident decision. First restore the selected physical backup into a non-production project, compare row counts and migration history, and validate the application there.

If production restore is approved:

1. Stop or redirect all Cron invocations and user writes.
2. Record the restore point and deployment ID.
3. Restore through the Supabase-supported process.
4. Reapply only migrations newer than the restore point after reviewing their data effects.
5. Deploy the matching application version.
6. Run read-only queue, storage, migration, header, and smoke checks before reopening traffic.

## Completion evidence

Archive these redacted artifacts:

- Vercel deployment ID/state and domain verification;
- Cron path/schedule list and first successful authenticated run time;
- production environment variable names only;
- async queue audit JSON;
- Supabase applied migration versions;
- Storage bucket/object aggregate counts;
- physical-backup timestamp and non-production restore result;
- rollback target deployment ID and operator approval.
