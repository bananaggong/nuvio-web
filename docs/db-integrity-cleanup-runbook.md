# DB Integrity Cleanup Runbook

This runbook is a plan, not an executed cleanup record. No production mutation was performed during the audit.

## Guardrails

1. Take and verify a restorable database snapshot before any cleanup session.
2. Run `npm run audit:db-integrity -- --json` and archive the aggregate result.
3. Resolve identities and canonical application choices with an authorized operator. Do not expose emails or application answers in tickets or logs.
4. Perform cleanup in a dedicated reviewed change window using an explicit transaction.
5. Do not apply `20260712010000_preflight_core_integrity_constraints.sql` in the same change that cleans rows.
6. Rerun the read-only audit after cleanup. Apply constraints only in a later change after a clean preflight and a non-production restore test.

## Duplicate application review

For each duplicate `(program_id, normalized_email)` group:

1. Compare status, program run, form snapshot, consent snapshot, answers, submitter, timestamps, and all child records.
2. Start with the operationally advanced row as the canonical candidate. Status progression is generally `submitted` -> `screening` -> `accepted` -> `checkedIn` -> `completed`; rejected or exceptional states require manual judgment.
3. Compare answer JSON field by field. The audited groups both contain different answer payloads, so no automatic overwrite is safe.
4. Confirm that both rows represent one intended application, not two legitimate historical submissions.
5. Repoint child rows only after checking their own unique constraints:
   - `application_status_events.application_id`
   - `scheduled_messages.application_id`
   - `participant_documents.application_id`
   - `review_requests.application_id`
   - `reviews.application_id`
6. Merge status history chronologically. Preserve the most complete form/consent snapshots and document every field-level decision.
7. Confirm the canonical `submitted_by`, program, and program run.
8. Delete the non-canonical application only after a second operator reviews the comparison and dependent-row counts.
9. Rerun the audit before committing the cleanup transaction.

Use placeholders in reviewed SQL; never paste production identifiers into source control:

```sql
begin;

-- Lock both rows selected by the reviewed duplicate report.
select id, program_id, program_run_id, status, submitted_by, submitted_at
from public.program_applications
where id in (:'canonical_id', :'duplicate_id')
for update;

-- Repoint each child table only after checking for target-side conflicts.
update public.application_status_events
set application_id = :'canonical_id'
where application_id = :'duplicate_id';

update public.scheduled_messages
set application_id = :'canonical_id'
where application_id = :'duplicate_id';

update public.participant_documents
set application_id = :'canonical_id'
where application_id = :'duplicate_id';

-- Reviews and review requests can have one-per-application constraints.
-- Inspect and resolve them manually before running either update.

-- Delete only after the reviewed field merge and dependent-row verification.
delete from public.program_applications where id = :'duplicate_id';

-- Run the invariant queries in this transaction, then commit only after review.
rollback;
```

The template ends in `rollback` by design. A production cleanup script must be separately reviewed and must change that only during the approved maintenance session.

## Missing `submitted_by`

1. For the two rows with one exact normalized profile-email match, verify the account with the operator before backfilling.
2. Resolve the row that also belongs to a duplicate group during canonical selection rather than as a separate update.
3. For the two rows with no profile match, inspect the original authenticated account and submission evidence. Restore/link the real profile where possible.
4. Do not create a fake shared owner or reuse an administrator ID merely to satisfy the constraint.
5. If legal retention requires an ownerless historical record, stop and revise the proposed `NOT NULL` design explicitly; do not bypass preflight silently.

Deterministic backfill candidate query, for secure operator use only:

```sql
select application.id, profile.id as proposed_submitted_by
from public.program_applications application
join public.profiles profile
  on lower(btrim(profile.email)) = lower(btrim(application.email))
where application.submitted_by is null
  and 1 = (
    select count(*)
    from public.profiles candidate
    where lower(btrim(candidate.email)) = lower(btrim(application.email))
  );
```

## Media candidate review

The audit found one semantic pair with different thumbnails and image arrays. Compare the two cards in the channel UI and inspect their legacy IDs and source history.

- If they are intentional image variants, keep both; no broad semantic constraint is planned.
- If one is a retry duplicate, preserve the intended image set and references, then remove the duplicate in a separately reviewed cleanup.
- The external-source unique index is safe independently because the audit found no existing source collisions for external providers.

## Constraint rollout

1. Restore a recent production snapshot to a non-production PostgreSQL environment.
2. Run the read-only audit with `--fail-on-findings` against that restore.
3. Apply `20260712010000_preflight_core_integrity_constraints.sql` to the restore.
4. Run `npm run test:db-concurrency`, application/review API tests, and a full build.
5. Verify profile deletion/account-erasure behavior because `submitted_by` becomes `NOT NULL` with `ON DELETE RESTRICT`.
6. Schedule the production constraint migration separately. The migration has no cleanup DML and must abort on any drift.
7. Rerun the production read-only audit immediately after migration and archive the result.

## Rollback planning

The preflight runs before DDL, so a dirty database should remain unchanged. If a later DDL step fails, rely on the migration transaction where supported and verify index/constraint state before retrying. Do not drop protections simply to make deployment green; correct the data or revise the reviewed invariant.
