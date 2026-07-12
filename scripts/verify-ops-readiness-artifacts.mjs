import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const audit = read("scripts/audit-async-operations.mjs");
const additiveMigration = read(
  "supabase/migrations/20260713000000_add_async_delivery_claim_columns.sql",
);
const enforcementMigration = read(
  "supabase/migrations/20260713001000_enforce_async_delivery_claims.sql",
);
const notifications = read("src/lib/notification-db.ts");
const reviewRequests = read("src/lib/review-request-db.ts");
const scheduledMessages = read("src/lib/scheduled-message-db.ts");
const sms = read("src/lib/sms-provider.ts");
const push = read("src/lib/browser-push.ts");
const cronRunner = read("src/lib/cron-step-runner.ts");
const vercel = JSON.parse(read("vercel.json"));
const report = read("docs/operations-readiness-2026-07-13.md");
const rollback = read("docs/operations-rollback-runbook.md");

assertIncludes(
  audit,
  '"isolation level repeatable read read only"',
  "read-only operations audit",
);
assertIncludes(audit, 'transaction.read_only !== "on"', "read-only assertion");
assertIncludes(audit, "missing_latest_email_outbox", "review outbox coverage");
assertIncludes(audit, "storage.objects", "storage catalog audit");
assertIncludes(
  audit,
  "It does not emit recipients, endpoints, object paths, row IDs, or secrets.",
  "PII-free output contract",
);

assertIncludes(additiveMigration, "add column if not exists claim_token", "additive claim column");
assertNotMatches(
  additiveMigration,
  /^\s*(insert\s+into|update|delete\s+from|truncate)\b/imu,
  "additive migration cleanup DML",
);
const preflightPosition = enforcementMigration.indexOf("do $preflight$");
const firstDdlPosition = enforcementMigration.indexOf("alter table");
assert(
  preflightPosition >= 0 && firstDdlPosition > preflightPosition,
  "enforcement migration preflight must precede DDL",
);
assertNotMatches(
  enforcementMigration,
  /^\s*(insert\s+into|update|delete\s+from|truncate)\b/imu,
  "enforcement migration cleanup DML",
);
assertIncludes(
  enforcementMigration,
  "notification_events_claim_state_chk",
  "notification claim constraint",
);
assertIncludes(
  enforcementMigration,
  "scheduled_messages_delivery_state_chk",
  "scheduled message state constraint",
);

assertIncludes(notifications, "claimToken: sql`gen_random_uuid()`", "notification claim token");
assertIncludes(
  notifications,
  'eq(notificationEvents.status, "pending")',
  "notification conditional claim",
);
assertIncludes(
  notifications,
  "dedupeKey: `notification-event:${event.id}`",
  "in-app retry dedupe",
);
assertIncludes(
  notifications,
  "return markNotificationDeliveryFailure(",
  "email configuration retry",
);
assertIncludes(
  reviewRequests,
  ".insert(notificationEvents)",
  "transactional review email outbox",
);
assertIncludes(
  scheduledMessages,
  "getNextScheduledMessageAttemptAt",
  "scheduled message retry backoff",
);
assertIncludes(
  scheduledMessages,
  "providerMessageId: delivery.providerMessageId",
  "scheduled message provider receipt",
);
assertIncludes(sms, "Mock SMS delivery must not be used in production.", "production SMS mock guard");
assertIncludes(push, "isBrowserPushMockDelivery", "browser push dry-run guard");
assertIncludes(cronRunner, "Promise.allSettled", "Cron partial-failure isolation");

assertDeepEqual(
  vercel.crons,
  [
    { path: "/api/cron/process-notifications", schedule: "20 0 * * *" },
    { path: "/api/cron/process-program-reminders", schedule: "0 0 * * *" },
    { path: "/api/cron/process-scheduled-messages", schedule: "10 0 * * *" },
    { path: "/api/cron/process-review-requests", schedule: "15 0 * * *" },
  ],
  "isolated Cron registry",
);

assertIncludes(report, "Release gate: **blocked**", "honest release gate");
assertIncludes(report, "No email, SMS, or browser push was sent", "external send boundary");
assertIncludes(report, "physical backup status is not verified", "backup evidence gap");
assertIncludes(rollback, "Three-phase database and application rollout", "compatible rollout sequence");
assertIncludes(rollback, "A Vercel rollback does not roll back database migrations", "rollback boundary");

console.log("Operations readiness artifact verification passed.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `${label}: missing ${JSON.stringify(expected)}`);
}

function assertNotMatches(source, pattern, label) {
  assert(!pattern.test(source), `${label}: unexpected ${pattern}`);
}

function assertDeepEqual(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
  );
}
