import { readdirSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
const args = new Set(process.argv.slice(2));
const envDirectory = process.env.NUVIO_OPS_ENV_DIR || process.cwd();
const format = args.has("--json") ? "json" : "markdown";
const failOnBlocking = args.has("--fail-on-blocking");

loadEnvConfig(envDirectory);

const databaseUrl =
  process.env.NUVIO_OPS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "NUVIO_OPS_DATABASE_URL, DATABASE_URL, or DIRECT_DATABASE_URL is required.",
  );
}

const sql = postgres(normalizeDatabaseUrl(databaseUrl), {
  connect_timeout: 15,
  idle_timeout: 5,
  max: 1,
  prepare: false,
});

try {
  const report = await sql.begin(
    "isolation level repeatable read read only",
    async (tx) => runAudit(tx),
  );
  process.stdout.write(
    format === "json"
      ? `${JSON.stringify(report, null, 2)}\n`
      : renderMarkdown(report),
  );
  if (failOnBlocking && report.summary.blockingFindingCount > 0) {
    process.exitCode = 2;
  }
} finally {
  await sql.end({ timeout: 5 });
}

async function runAudit(tx) {
  await tx`set local statement_timeout = '20s'`;
  await tx`set local lock_timeout = '2s'`;
  const [transaction] = await tx`
    select
      current_setting('transaction_read_only') as read_only,
      current_setting('transaction_isolation') as isolation
  `;
  if (transaction.read_only !== "on") {
    throw new Error("Operations audit refused to run outside a read-only transaction.");
  }

  const requiredTables = [
    "notification_events",
    "push_subscriptions",
    "review_requests",
    "scheduled_messages",
    "user_notifications",
  ];
  const tableRows = await tx`
    select requested.table_name,
      to_regclass('public.' || requested.table_name)::text as relation
    from unnest(${requiredTables}::text[]) as requested(table_name)
    order by requested.table_name
  `;
  const availableTables = new Set(
    tableRows.filter((row) => row.relation).map((row) => row.table_name),
  );
  const missingTables = requiredTables.filter(
    (table) => !availableTables.has(table),
  );
  const checks = [];
  const metrics = {};
  const diagnostics = {};

  addCheck(checks, {
    count: missingTables.length,
    details: missingTables.length > 0 ? { missingTables } : undefined,
    id: "required_async_tables_present",
    severity: "blocking",
  });

  const columns = await listPublicColumns(tx, requiredTables);
  if (availableTables.has("notification_events")) {
    await auditNotificationEvents(tx, columns, checks, metrics);
  }
  if (availableTables.has("user_notifications")) {
    await auditUserNotifications(tx, checks, metrics);
  }
  if (availableTables.has("review_requests")) {
    await auditReviewRequests(tx, checks, metrics);
  }
  if (availableTables.has("scheduled_messages")) {
    await auditScheduledMessages(tx, columns, checks, metrics);
  }
  if (availableTables.has("push_subscriptions")) {
    await auditPushSubscriptions(tx, checks, metrics);
  }

  await auditMigrationState(tx, checks, diagnostics);
  await auditStorage(tx, checks, diagnostics);

  const blockingFindingCount = checks
    .filter((check) => check.severity === "blocking" && check.count > 0)
    .reduce((sum, check) => sum + check.count, 0);
  const warningFindingCount = checks
    .filter((check) => check.severity === "warning" && check.count > 0)
    .reduce((sum, check) => sum + check.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    transaction: {
      isolation: transaction.isolation,
      readOnly: transaction.read_only === "on",
    },
    summary: {
      blockingFindingCount,
      checkCount: checks.length,
      status: blockingFindingCount > 0 ? "blocked" : "pass",
      warningFindingCount,
    },
    metrics,
    diagnostics,
    checks,
  };
}

async function auditNotificationEvents(tx, columns, checks, metrics) {
  const hasClaimColumns = hasColumns(columns, "notification_events", [
    "claim_token",
    "claimed_at",
  ]);
  const [summary] = await tx`
    select
      count(*)::bigint as total,
      count(*) filter (where status = 'pending')::bigint as pending,
      count(*) filter (
        where status = 'pending'
          and (scheduled_for is null or scheduled_for <= now())
          and (next_attempt_at is null or next_attempt_at <= now())
      )::bigint as due_pending,
      count(*) filter (
        where status = 'pending' and attempt_count > 0
      )::bigint as retry_pending,
      count(*) filter (
        where status = 'processing' and updated_at <= now() - interval '30 minutes'
      )::bigint as stale_processing,
      count(*) filter (where status = 'failed')::bigint as terminal_failed,
      count(*) filter (
        where status = 'pending'
          and (scheduled_for is null or scheduled_for <= now())
          and (next_attempt_at is null or next_attempt_at <= now())
          and created_at <= now() - interval '24 hours'
      )::bigint as overdue_24h,
      count(*) filter (
        where status in ('sent', 'skipped') and delivered_at is null
      )::bigint as terminal_missing_delivered_at
    from public.notification_events
  `;
  const statusRows = await tx`
    select channel::text as channel, status::text as status, count(*)::bigint as count
    from public.notification_events
    group by channel, status
    order by channel, status
  `;
  const [duplicateDedupe] = await tx`
    select count(*)::bigint as group_count
    from (
      select dedupe_key
      from public.notification_events
      where dedupe_key is not null
      group by dedupe_key
      having count(*) > 1
    ) duplicates
  `;
  const [claimConstraint] = await tx`
    select exists (
      select 1
      from pg_constraint
      where conrelid = 'public.notification_events'::regclass
        and conname = 'notification_events_claim_state_chk'
        and convalidated
    ) as present
  `;

  metrics.notificationEvents = {
    ...numericRecord(summary),
    byChannelAndStatus: statusRows.map(numericRecord),
  };
  addCheck(checks, {
    count: toNumber(duplicateDedupe.group_count),
    id: "notification_event_duplicate_dedupe_keys",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(summary.stale_processing),
    id: "notification_event_stale_processing_claims",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(summary.terminal_missing_delivered_at),
    id: "notification_event_invalid_terminal_state",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(summary.overdue_24h),
    id: "notification_event_due_over_24h",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(summary.terminal_failed),
    id: "notification_event_terminal_failures",
    severity: "blocking",
  });
  addCheck(checks, {
    count: hasClaimColumns && claimConstraint.present ? 0 : 1,
    id: "notification_event_claim_token_protection",
    severity: "blocking",
  });
}

async function auditUserNotifications(tx, checks, metrics) {
  const [summary] = await tx`
    select count(*)::bigint as total,
      count(*) filter (where dedupe_key is not null)::bigint as deduped
    from public.user_notifications
  `;
  const [duplicates] = await tx`
    select count(*)::bigint as group_count
    from (
      select dedupe_key
      from public.user_notifications
      where dedupe_key is not null
      group by dedupe_key
      having count(*) > 1
    ) duplicate_groups
  `;
  metrics.userNotifications = numericRecord(summary);
  addCheck(checks, {
    count: toNumber(duplicates.group_count),
    id: "user_notification_duplicate_dedupe_keys",
    severity: "blocking",
  });
}

async function auditReviewRequests(tx, checks, metrics) {
  const [summary] = await tx`
    select
      count(*)::bigint as total,
      count(*) filter (
        where status in ('sent', 'opened')
          and next_reminder_at is not null
          and next_reminder_at <= now()
      )::bigint as due_reminders,
      count(*) filter (
        where status in ('sent', 'opened')
          and request_count > 0
          and not exists (
            select 1
            from public.notification_events event
            where event.dedupe_key = concat_ws(
              ':',
              'review-request',
              'email',
              case
                when review_requests.request_count > 1
                  then 'review.request.reminder'
                else 'review.request.created'
              end,
              review_requests.id::text,
              review_requests.request_count::text
            )
          )
      )::bigint as missing_latest_email_outbox,
      count(*) filter (
        where request_count < 0 or request_count > 4
      )::bigint as invalid_request_count,
      count(*) filter (
        where status in ('sent', 'opened')
          and (request_token_hash is null or request_token_expires_at is null)
      )::bigint as active_missing_token
    from public.review_requests
  `;
  const statusRows = await tx`
    select status, count(*)::bigint as count
    from public.review_requests
    group by status
    order by status
  `;
  metrics.reviewRequests = {
    ...numericRecord(summary),
    byStatus: statusRows.map(numericRecord),
  };
  for (const [id, value] of [
    ["review_request_missing_latest_email_outbox", summary.missing_latest_email_outbox],
    ["review_request_invalid_request_count", summary.invalid_request_count],
    ["review_request_active_missing_token", summary.active_missing_token],
  ]) {
    addCheck(checks, { count: toNumber(value), id, severity: "blocking" });
  }
}

async function auditScheduledMessages(tx, columns, checks, metrics) {
  const hasRetryColumns = hasColumns(columns, "scheduled_messages", [
    "attempt_count",
    "max_attempts",
    "last_attempt_at",
    "next_attempt_at",
    "provider_message_id",
    "claim_token",
    "claimed_at",
  ]);
  const retryDueFilter = hasRetryColumns
    ? "and (next_attempt_at is null or next_attempt_at <= now())"
    : "";
  const [summary] = await tx.unsafe(`
    select
      count(*)::bigint as total,
      count(*) filter (
        where delivery_status = 'scheduled'
          and (scheduled_for is null or scheduled_for <= now())
          ${retryDueFilter}
      )::bigint as due_scheduled,
      count(*) filter (
        where delivery_status = 'processing'
          and updated_at <= now() - interval '30 minutes'
      )::bigint as stale_processing,
      count(*) filter (where delivery_status = 'failed')::bigint as failed,
      count(*) filter (
        where delivery_status = 'sent' and sent_at is null
      )::bigint as sent_missing_timestamp,
      count(*) filter (
        where delivery_status <> 'sent' and sent_at is not null
      )::bigint as unsent_with_timestamp
    from public.scheduled_messages
  `);
  const statusRows = await tx`
    select delivery_status::text as status, count(*)::bigint as count
    from public.scheduled_messages
    group by delivery_status
    order by delivery_status
  `;
  metrics.scheduledMessages = {
    ...numericRecord(summary),
    byStatus: statusRows.map(numericRecord),
  };
  for (const [id, value] of [
    ["scheduled_message_stale_processing_claims", summary.stale_processing],
    ["scheduled_message_sent_missing_timestamp", summary.sent_missing_timestamp],
    ["scheduled_message_unsent_with_timestamp", summary.unsent_with_timestamp],
  ]) {
    addCheck(checks, { count: toNumber(value), id, severity: "blocking" });
  }
  addCheck(checks, {
    count: toNumber(summary.failed),
    id: "scheduled_message_terminal_failures",
    severity: "warning",
  });
  addCheck(checks, {
    count: toNumber(summary.due_scheduled),
    id: "scheduled_message_due_backlog",
    severity: "blocking",
  });
  addCheck(checks, {
    count: hasRetryColumns ? 0 : 1,
    id: "scheduled_message_retry_and_claim_protection",
    severity: "blocking",
  });
}

async function auditPushSubscriptions(tx, checks, metrics) {
  const [summary] = await tx`
    select
      count(*)::bigint as total,
      count(distinct user_id)::bigint as users
    from public.push_subscriptions
  `;
  const [duplicates] = await tx`
    select count(*)::bigint as group_count
    from (
      select endpoint
      from public.push_subscriptions
      group by endpoint
      having count(*) > 1
    ) duplicate_groups
  `;
  const [overLimit] = await tx`
    select count(*)::bigint as user_count
    from (
      select user_id
      from public.push_subscriptions
      group by user_id
      having count(*) > 8
    ) over_limit
  `;
  const endpoints = await tx`
    select endpoint from public.push_subscriptions
  `;
  const unsupported = endpoints.filter(
    (row) => !isSupportedPushEndpoint(row.endpoint),
  ).length;
  metrics.pushSubscriptions = {
    ...numericRecord(summary),
    unsupportedEndpointCount: unsupported,
  };
  addCheck(checks, {
    count: toNumber(duplicates.group_count),
    id: "push_subscription_duplicate_endpoints",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(overLimit.user_count),
    id: "push_subscription_users_over_limit",
    severity: "blocking",
  });
  addCheck(checks, {
    count: unsupported,
    id: "push_subscription_unsupported_endpoints",
    severity: "blocking",
  });
}

async function auditMigrationState(tx, checks, diagnostics) {
  const localMigrations = readdirSync(join(process.cwd(), "supabase", "migrations"))
    .filter((name) => /^\d+_.+\.sql$/u.test(name))
    .sort();
  const migrationTableExists = await tx`
    select to_regclass('supabase_migrations.schema_migrations')::text as relation
  `;
  if (!migrationTableExists[0]?.relation) {
    addCheck(checks, {
      count: 1,
      id: "supabase_migration_history_present",
      severity: "blocking",
    });
    return;
  }
  const appliedRows = await tx`
    select version::text as version
    from supabase_migrations.schema_migrations
    order by version
  `;
  const applied = new Set(appliedRows.map((row) => row.version));
  const missing = localMigrations.filter(
    (name) => !applied.has(name.split("_", 1)[0]),
  );
  diagnostics.migrations = {
    appliedCount: applied.size,
    localCount: localMigrations.length,
    missingLocalMigrations: missing,
  };
  addCheck(checks, {
    count: missing.length,
    id: "supabase_local_migrations_not_applied",
    severity: "blocking",
  });
}

async function auditStorage(tx, checks, diagnostics) {
  const [tables] = await tx`
    select
      to_regclass('storage.buckets')::text as buckets,
      to_regclass('storage.objects')::text as objects
  `;
  const accessible = Boolean(tables.buckets && tables.objects);
  addCheck(checks, {
    count: accessible ? 0 : 1,
    id: "supabase_storage_catalog_accessible",
    severity: "blocking",
  });
  if (!accessible) return;

  const rows = await tx`
    select
      bucket.id::text as bucket,
      bucket.public,
      count(object.id)::bigint as object_count
    from storage.buckets bucket
    left join storage.objects object on object.bucket_id = bucket.id
    group by bucket.id, bucket.public
    order by bucket.id
  `;
  const expectedBuckets = [
    "magazine-assets",
    "profile-avatars",
    "program-assets",
    "review-images",
    "village-assets",
    "village-media-assets",
  ];
  const existing = new Set(rows.map((row) => row.bucket));
  diagnostics.storage = {
    buckets: rows.map((row) => ({
      name: row.bucket,
      objectCount: toNumber(row.object_count),
      public: row.public === true,
    })),
    missingExpectedBuckets: expectedBuckets.filter(
      (bucket) => !existing.has(bucket),
    ),
  };
  addCheck(checks, {
    count: diagnostics.storage.missingExpectedBuckets.length,
    id: "supabase_expected_storage_buckets_missing",
    severity: "warning",
  });
}

async function listPublicColumns(tx, tables) {
  const rows = await tx`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(${tables}::text[])
  `;
  const result = new Map();
  for (const row of rows) {
    const current = result.get(row.table_name) ?? new Set();
    current.add(row.column_name);
    result.set(row.table_name, current);
  }
  return result;
}

function hasColumns(columns, table, required) {
  const available = columns.get(table) ?? new Set();
  return required.every((column) => available.has(column));
}

function isSupportedPushEndpoint(value) {
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (!url.port || url.port === "443") &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (
        host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host === "web.push.apple.com" ||
        (host.endsWith(".notify.windows.com") && host !== "notify.windows.com")
      )
    );
  } catch {
    return false;
  }
}

function addCheck(checks, { count, details, id, severity }) {
  checks.push({
    count,
    ...(details ? { details } : {}),
    id,
    severity,
    status: count === 0 ? "pass" : "finding",
  });
}

function numericRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === "string" && !/^-?\d+(?:\.\d+)?$/u.test(value)) {
        return [key, value];
      }
      return [key, toNumber(value)];
    }),
  );
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeDatabaseUrl(value) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
      return url.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

function renderMarkdown(report) {
  const lines = [
    "# NUVIO Async Operations Audit",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Transaction: read-only=${report.transaction.readOnly}, isolation=${report.transaction.isolation}`,
    `- Result: ${report.summary.status}`,
    `- Blocking findings: ${report.summary.blockingFindingCount}`,
    `- Warnings: ${report.summary.warningFindingCount}`,
    "",
    "| Check | Severity | Count | Status |",
    "| --- | --- | ---: | --- |",
  ];
  for (const check of report.checks) {
    lines.push(
      `| \`${check.id}\` | ${check.severity} | ${check.count} | ${check.status} |`,
    );
  }
  lines.push(
    "",
    "## Metrics",
    "",
    "```json",
    JSON.stringify(report.metrics, null, 2),
    "```",
    "",
    "## Diagnostics",
    "",
    "The output contains aggregate counts, migration filenames, and bucket names only.",
    "It does not emit recipients, endpoints, object paths, row IDs, or secrets.",
    "",
    "```json",
    JSON.stringify(report.diagnostics, null, 2),
    "```",
    "",
  );
  return `${lines.join("\n")}\n`;
}
