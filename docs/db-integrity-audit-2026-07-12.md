# NUVIO DB Integrity and Concurrency Audit

Audit date: 2026-07-12

## Scope and safety boundary

- The production database was inspected inside a `REPEATABLE READ READ ONLY` transaction.
- The audit script verifies `transaction_read_only = on` and aborts otherwise.
- No production row was inserted, updated, deleted, merged, or anonymized.
- The proposed migration was not applied to production.
- Write and concurrency tests ran only in an in-memory local PGlite PostgreSQL instance.
- Output contains aggregate counts and anonymous group ordinals only. It emits no email, user ID, application ID, or review ID.

Command used for the production read-only pass:

```powershell
$env:NUVIO_AUDIT_ENV_DIR='C:\projects\NUVIO\nuvio-web'
npm.cmd run audit:db-integrity -- --json
```

Observed transaction evidence:

- `transaction_read_only`: `on`
- isolation: `repeatable read`
- generated at: `2026-07-12T13:44:04.593Z`

## Executive result

Release gate: **blocked pending reviewed application cleanup**.

The final pass ran 34 checks and reported an aggregate blocking count of 17 plus 1 warning. Six blocking counts come from unsafe legacy application rows; the other 11 identify database protections that are proposed but intentionally not installed in production yet.

| Area | Rows inspected | Result |
| --- | ---: | --- |
| Program applications | 10 | 2 normalized program/email duplicate groups; 4 missing `submitted_by` |
| Reviews | 71 | 0 active `application_id` duplicates |
| Public foreign keys | 84 constraints | 0 orphan rows |
| Program/run scope | Applications, reviews, review requests | 0 mismatches |
| Host village memberships | 9 | 0 normalized email duplicates; 0 active user duplicates |
| Village media | 15 | 0 duplicate external sources; 1 semantic review candidate |
| Channel board JSON | Draft and published posts | 0 duplicate IDs; 0 missing IDs; 0 semantic duplicates |

Read-only snapshots during the audit alternated between 8 and 9 memberships; the final snapshot observed 9. This was external production activity between transactions, not an audit write. Every snapshot reported zero membership integrity findings.

## Findings

### P0: duplicate program applications

There are two groups keyed by `(program_id, lower(trim(email)))`. Each group has two rows, so there are two excess rows in total.

Anonymous group diagnostics:

| Group | Statuses | Owner state | Run variants | Answer variants | Related records | Submission span |
| --- | --- | --- | ---: | ---: | --- | ---: |
| 1 | `accepted`, `submitted` | Both rows owned by the same profile | 1 | 2 | 4 status events; no reviews/messages/documents/requests | 61,369 seconds |
| 2 | `completed`, `submitted` | One owned row, one missing owner | 1 | 2 | No related child rows | 108,142 seconds |

Both groups contain different answer payloads. A blind `keep oldest` or `keep newest` deletion would risk discarding user input. The cleanup must select the operationally advanced row (`accepted` or `completed`) as the initial canonical candidate, compare both snapshots and answers, then merge deliberately.

Current code takes a transaction-scoped advisory lock and checks for an existing normalized email before inserting. That protects the current API path, but the database only has a non-unique lookup index. A second writer, legacy code, or a direct privileged insert can still violate the invariant. The proposed migration replaces it with a unique expression index.

### P0: missing application owners

Four of ten applications have `submitted_by is null`.

- 2 have exactly one matching profile email and can be deterministically backfilled after operator review.
- 2 have no matching profile and require identity resolution; no placeholder account should be invented.
- 1 of the four belongs to a duplicate application group and should be resolved as part of that merge.
- No ambiguous multi-profile email matches were found.

The current authenticated API always supplies a confirmed user ID. The application write helper is changed to require a valid UUID at the type and runtime boundaries. The proposed migration refuses to set `NOT NULL` until every historical null has been resolved.

### P1: missing database protections on currently clean channel data

The data is currently clean, but these protections were absent:

- normalized unique membership email per village;
- one active membership per village/user;
- a required `user_id` for every active membership;
- unique external media source per village/provider;
- database checks for non-empty, unique board post IDs inside draft and published JSON.

The proposed migration adds these only after a no-finding preflight. Board mutations are also moved into one transaction with a per-village advisory lock, preventing concurrent read-modify-write requests from losing one another's posts.

### P2: one media semantic review candidate

One pair shares village/category/provider/title/date/body/source, but the two rows have different thumbnails and image sets. Both rows have legacy IDs. This may represent two intentional gallery items rather than a retry duplicate.

No broad semantic unique index is proposed. A content owner must inspect the pair before any deletion decision. External providers (`instagram`, `youtube`, `naver`, `video`) receive a narrower source URL unique index because the production audit found zero conflicts on that natural key.

## Verified healthy invariants

- Active review duplicates by `application_id`: 0.
- All review duplicates including deleted rows: 0.
- Application, review, and review-request program/run mismatches: 0.
- Orphans across every public FK discovered from `pg_constraint`: 0 across 84 constraints.
- Active host memberships without `user_id`: 0.
- Village media duplicate `legacy_id` values: 0.
- Village page-section natural-key duplicates: 0.
- Channel board missing/duplicate IDs in draft and published JSON: 0.
- Existing review active-row unique index is installed.
- Existing application program/run guard trigger is installed.

## Local concurrency evidence

`npm run test:db-concurrency` runs against an in-memory local PostgreSQL engine.

- 16 parallel application inserts produced 1 row and 15 `23505` unique violations.
- 12 parallel review inserts produced 1 active review and 11 unique violations.
- After soft-deleting that review, 12 retries produced exactly 1 replacement active review.
- Parallel normalized membership and external media inserts produced one row each.
- Duplicate board IDs were rejected by the proposed JSON check constraint.
- A dirty legacy fixture caused the migration to fail before its first DDL statement.

## Proposed artifacts

- `scripts/audit-db-integrity.mjs`: repeatable, PII-free, production-safe read-only audit.
- `tests/db-concurrency.test.ts`: local parallel insert and retry tests.
- `supabase/migrations/20260712013000_preflight_core_integrity_constraints.sql`: preflight-first constraint proposal with no cleanup DML.
- `docs/db-integrity-cleanup-runbook.md`: reviewed cleanup and release sequence.

## Release decision

Do not apply the proposed migration yet. Resolve the two application duplicate groups and four missing owners under the cleanup runbook, manually classify the media candidate, and rerun:

```powershell
npm.cmd run audit:db-integrity -- --fail-on-findings
npm.cmd run verify:db-integrity
```

The release gate opens only when the read-only audit reports zero blocking findings and the migration has passed on a non-production database copy.
