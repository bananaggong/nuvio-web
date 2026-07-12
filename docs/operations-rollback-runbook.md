# NUVIO Operations Rollout and Rollback Runbook

This runbook is a procedure, not a record that production changes were applied.

## Before rollout

1. Record the Supabase plan. The current Free plan does not include guaranteed automatic backups or PITR.
2. For a Free project, create the logical backup set below from a trusted workstation and retain it off site. For a paid project, verify the managed recovery point instead.
3. Export Storage object bytes separately; database dumps contain Storage metadata, not the stored files.
4. Restore the backup into a non-production target and run row-count, migration, Storage, and application smoke checks.
5. Run the production read-only queue audit and confirm there are no processing rows.
6. Configure email and exactly one SMS path. Keep automatic SMS disabled while manual dispatch is the chosen workflow.
7. Record the current Vercel production deployment ID and one known-good previous deployment ID.

## Free-plan logical backup

Supabase recommends regular `db dump` exports for Free projects. Run these commands only in a trusted operator terminal. Keep the output outside the repository, encrypt it at rest, and never attach the SQL files to tickets or commits.

```powershell
if (-not $env:DIRECT_DATABASE_URL) {
  throw "DIRECT_DATABASE_URL is required in the operator environment."
}

$backupDir = Join-Path $HOME (
  "nuvio-backups\\" + (Get-Date -Format "yyyyMMdd-HHmmss")
)
New-Item -ItemType Directory -Path $backupDir | Out-Null

npx.cmd --yes supabase@latest db dump `
  --db-url "$env:DIRECT_DATABASE_URL" `
  --role-only `
  --file (Join-Path $backupDir "roles.sql")
npx.cmd --yes supabase@latest db dump `
  --db-url "$env:DIRECT_DATABASE_URL" `
  --file (Join-Path $backupDir "schema.sql")
npx.cmd --yes supabase@latest db dump `
  --db-url "$env:DIRECT_DATABASE_URL" `
  --data-only `
  --use-copy `
  --file (Join-Path $backupDir "data.sql")

Get-ChildItem -LiteralPath $backupDir -File |
  Select-Object Name, Length
Get-ChildItem -LiteralPath $backupDir -File |
  Get-FileHash -Algorithm SHA256 |
  Select-Object Path, Hash
```

The current audit workstation has neither `pg_dump` nor Docker, so it cannot execute this export yet. Install a supported PostgreSQL client or Docker on the dedicated backup workstation before relying on this procedure. A successful command is not enough: prove that the three files are non-empty, archive their hashes, and restore them into an isolated target.

Storage objects are not included in database backups. Maintain an encrypted off-site copy of every production bucket's object bytes and a manifest containing bucket name, object count, byte count, and checksum. Do not log object paths when they contain personal information.

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

A production restore is a last resort and requires an incident decision. Free projects have no guaranteed Dashboard restore point, so first restore the operator-managed logical backup into a non-production project, compare row counts and migration history, and validate the application there. On a paid plan, use the verified managed recovery point instead.

If production restore is approved:

1. Stop or redirect all Cron invocations and user writes.
2. Record the restore point and deployment ID.
3. Restore the verified logical backup in roles, schema, then data order, or use the Supabase-managed recovery point when the plan supports it.
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
- Supabase plan and the applicable managed or operator-managed backup policy;
- logical dump timestamps, sizes, hashes, and non-production restore result;
- Storage object export count, bytes, manifest hash, and restore result;
- rollback target deployment ID and operator approval.
