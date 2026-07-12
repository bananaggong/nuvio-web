import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const migration = read(
  "supabase/migrations/20260712010000_preflight_core_integrity_constraints.sql",
);
const audit = read("scripts/audit-db-integrity.mjs");
const applications = read("src/lib/host-application-db.ts");
const reviews = read("src/lib/review-db.ts");
const boards = read("src/lib/channel-board-posts.ts");
const schema = read("src/db/schema.ts");
const report = read("docs/db-integrity-audit-2026-07-12.md");
const runbook = read("docs/db-integrity-cleanup-runbook.md");

assertIncludes(
  audit,
  '"isolation level repeatable read read only"',
  "read-only audit transaction",
);
assertIncludes(
  audit,
  'transaction.read_only !== "on"',
  "read-only runtime assertion",
);
assertIncludes(audit, "pg_constraint", "dynamic foreign-key audit");
assertIncludes(audit, "jsonb_array_elements", "board JSON audit");

const preflightPosition = migration.indexOf("do $preflight$");
const firstDdlPosition = migration.indexOf("drop index if exists");
assert(
  preflightPosition >= 0 && firstDdlPosition > preflightPosition,
  "migration preflight must precede all DDL",
);
assertIncludes(migration, "raise exception using", "preflight failure");
assertNotMatches(migration, /^\s*(insert\s+into|update|delete\s+from)\b/imu, "cleanup DML");
assertIncludes(
  migration,
  "program_applications_program_normalized_email_uidx",
  "application unique index",
);
assertIncludes(migration, "alter column submitted_by set not null", "submitter constraint");
assertIncludes(
  migration,
  "host_village_memberships_village_normalized_email_uidx",
  "membership unique index",
);
assertIncludes(
  migration,
  "host_village_memberships_active_user_required_chk",
  "active membership user constraint",
);
assertIncludes(
  migration,
  "village_media_contents_external_source_uidx",
  "media source unique index",
);
assertIncludes(
  migration,
  "jsonb_array_has_unique_nonempty_ids",
  "board post ID constraint",
);

assertIncludes(applications, "program-application:${program.id}:${email}", "application lock");
assertIncludes(applications, "submittedBy: string", "required application submitter");
assertIncludes(
  applications,
  "isProgramApplicationDuplicateDatabaseError",
  "application unique-error mapping",
);
assertIncludes(reviews, "review:${application.applicationId}", "review lock");
assertIncludes(
  reviews,
  "isReviewApplicationDuplicateDatabaseError",
  "review unique-error mapping",
);
assertIncludes(boards, "channel-board:${normalizedVillageSlug}", "board mutation lock");
assertIncludes(boards, "getDb().transaction", "board mutation transaction");
assertIncludes(boards, "villagePageRevisions", "board revision in transaction");

for (const protection of [
  "program_applications_program_normalized_email_uidx",
  "host_village_memberships_village_normalized_email_uidx",
  "host_village_memberships_active_user_required_chk",
  "village_media_contents_external_source_uidx",
  "village_page_sections_board_draft_post_ids_chk",
]) {
  assertIncludes(schema, protection, `schema protection ${protection}`);
}

assertIncludes(report, "No production row was inserted", "production write boundary");
assertIncludes(report, "Release gate: **blocked", "release gate");
assertIncludes(runbook, "rollback;", "cleanup rollback default");
assertIncludes(runbook, "Do not create a fake shared owner", "identity cleanup guard");

console.log("DB integrity artifact verification passed.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `${label}: missing ${JSON.stringify(expected)}`);
}

function assertNotMatches(source, pattern, label) {
  assert(!pattern.test(source), `${label}: unexpected ${pattern}`);
}
