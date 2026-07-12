import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  isSupportedBrowserPushEndpoint,
  sendBrowserPushNotification,
} from "@/lib/browser-push";
import { runCronSteps } from "@/lib/cron-step-runner";
import { sendEmailMessage } from "@/lib/email-provider";
import { buildReviewRequestNotificationPlan } from "@/lib/notification-db";
import { getNextScheduledMessageAttemptAt } from "@/lib/scheduled-message-db";
import { getSmsDeliveryReadiness, sendSmsMessage } from "@/lib/sms-provider";

const additiveMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260713000000_add_async_delivery_claim_columns.sql",
    import.meta.url,
  ),
  "utf8",
);
const enforcementMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260713001000_enforce_async_delivery_claims.sql",
    import.meta.url,
  ),
  "utf8",
);

test("async delivery migration fails before DDL while a worker owns a claim", async () => {
  const db = await createFixtureDatabase();
  try {
    await db.exec(additiveMigration);
    await db.query(
      `insert into public.notification_events
        (id, event_type, channel, status, title, body, attempt_count, last_attempt_at)
       values ($1, 'test', 'inApp', 'processing', 'title', 'body', 1, now())`,
      [randomUUID()],
    );

    await assert.rejects(
      db.exec(enforcementMigration),
      /async delivery preflight failed/u,
    );
    const columns = await db.query<{ count: number }>(
      `select count(*)::integer as count
       from pg_constraint
       where conrelid = 'public.notification_events'::regclass
         and conname = 'notification_events_claim_state_chk'`,
    );
    assert.equal(columns.rows[0]?.count, 0);
  } finally {
    await db.close();
  }
});

test("parallel notification claims have one owner and reject stale finalizers", async () => {
  const db = await createMigratedFixtureDatabase();
  try {
    const eventId = randomUUID();
    await db.query(
      `insert into public.notification_events
        (id, event_type, channel, title, body, dedupe_key)
       values ($1, 'test', 'inApp', 'title', 'body', 'event:test')`,
      [eventId],
    );

    const claims = await Promise.all(
      Array.from({ length: 16 }, () =>
        db.query<{ claim_token: string }>(
          `update public.notification_events
           set
             attempt_count = attempt_count + 1,
             claimed_at = now(),
             claim_token = gen_random_uuid(),
             last_attempt_at = now(),
             status = 'processing'
           where id = $1 and status = 'pending'
           returning claim_token::text`,
          [eventId],
        ),
      ),
    );
    const owners = claims.flatMap((claim) => claim.rows);
    assert.equal(owners.length, 1);

    const staleFinalize = await db.query(
      `update public.notification_events
       set status = 'sent', delivered_at = now(), claim_token = null, claimed_at = null
       where id = $1 and status = 'processing' and claim_token = $2`,
      [eventId, randomUUID()],
    );
    assert.equal(staleFinalize.affectedRows, 0);

    const ownerFinalize = await db.query(
      `update public.notification_events
       set status = 'sent', delivered_at = now(), claim_token = null, claimed_at = null
       where id = $1 and status = 'processing' and claim_token = $2`,
      [eventId, owners[0].claim_token],
    );
    assert.equal(ownerFinalize.affectedRows, 1);

    await Promise.all(
      Array.from({ length: 16 }, () =>
        db.query(
          `insert into public.user_notifications
            (id, user_id, type, title, body, dedupe_key)
           values ($1, $2, 'test', 'title', 'body', $3)
           on conflict do nothing`,
          [randomUUID(), randomUUID(), `notification-event:${eventId}`],
        ),
      ),
    );
    const notifications = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.user_notifications",
    );
    assert.equal(notifications.rows[0]?.count, 1);

    await Promise.all(
      Array.from({ length: 16 }, () =>
        db.query(
          `insert into public.notification_events
            (id, event_type, channel, title, body, dedupe_key)
           values ($1, 'retry', 'email', 'title', 'body', 'event:retry')
           on conflict do nothing`,
          [randomUUID()],
        ),
      ),
    );
    const dedupedEvents = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.notification_events where dedupe_key = 'event:retry'",
    );
    assert.equal(dedupedEvents.rows[0]?.count, 1);

    const endpoint = "https://fcm.googleapis.com/fcm/send/concurrent";
    const userId = randomUUID();
    await Promise.all(
      Array.from({ length: 16 }, () =>
        db.query(
          `insert into public.push_subscriptions
            (id, user_id, endpoint, p256dh, auth, updated_at)
           values ($1, $2, $3, 'key', 'auth', now())
           on conflict (endpoint) do update
           set user_id = excluded.user_id, updated_at = excluded.updated_at`,
          [randomUUID(), userId, endpoint],
        ),
      ),
    );
    const subscriptions = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.push_subscriptions where endpoint = $1",
      [endpoint],
    );
    assert.equal(subscriptions.rows[0]?.count, 1);
  } finally {
    await db.close();
  }
});

test("scheduled SMS retries are bounded and keep a stable provider idempotency key", async () => {
  const db = await createMigratedFixtureDatabase();
  const previousProvider = process.env.SMS_PROVIDER;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    setEnv("NODE_ENV", "test");
    process.env.SMS_PROVIDER = "mock";
    const messageId = randomUUID();
    await db.query(
      `insert into public.scheduled_messages
        (id, delivery_status, scheduled_for)
       values ($1, 'scheduled', now() - interval '1 minute')`,
      [messageId],
    );

    const claims = await Promise.all(
      Array.from({ length: 12 }, () => claimScheduledMessage(db, messageId)),
    );
    const owners = claims.flatMap((claim) => claim.rows);
    assert.equal(owners.length, 1);
    assert.equal(owners[0].attempt_count, 1);

    const retryAt = getNextScheduledMessageAttemptAt(1, new Date(0));
    assert.equal(retryAt.toISOString(), "1970-01-01T00:05:00.000Z");
    await db.query(
      `update public.scheduled_messages
       set
         claim_token = null,
         claimed_at = null,
         delivery_status = 'scheduled',
         next_attempt_at = now() - interval '1 second'
       where id = $1 and claim_token = $2`,
      [messageId, owners[0].claim_token],
    );

    const retryClaims = await Promise.all(
      Array.from({ length: 12 }, () => claimScheduledMessage(db, messageId)),
    );
    const retryOwners = retryClaims.flatMap((claim) => claim.rows);
    assert.equal(retryOwners.length, 1);
    assert.equal(retryOwners[0].attempt_count, 2);

    const first = await sendSmsMessage({
      body: "dry run",
      idempotencyKey: messageId,
      to: "01000000000",
    });
    const retried = await sendSmsMessage({
      body: "dry run",
      idempotencyKey: messageId,
      to: "01000000000",
    });
    assert.equal(first.providerMessageId, retried.providerMessageId);
  } finally {
    restoreEnv("SMS_PROVIDER", previousProvider);
    restoreEnv("NODE_ENV", previousNodeEnv);
    await db.close();
  }
});

test("email, SMS, and browser push mocks perform no external fetch", async () => {
  const previous = {
    emailProvider: process.env.EMAIL_PROVIDER,
    nodeEnv: process.env.NODE_ENV,
    smsProvider: process.env.SMS_PROVIDER,
    webPushMode: process.env.WEB_PUSH_DELIVERY_MODE,
  };
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  try {
    setEnv("NODE_ENV", "test");
    process.env.EMAIL_PROVIDER = "mock";
    process.env.SMS_PROVIDER = "mock";
    process.env.WEB_PUSH_DELIVERY_MODE = "mock";
    globalThis.fetch = (async () => {
      fetchCount += 1;
      throw new Error("External fetch must not run in mock mode.");
    }) as typeof fetch;

    const email = await sendEmailMessage({
      idempotencyKey: "email-event-1",
      subject: "dry run",
      text: "dry run",
      to: "dry-run@nuvio.invalid",
    });
    const sms = await sendSmsMessage({
      body: "dry run",
      idempotencyKey: "sms-event-1",
      to: "01000000000",
    });
    const push = await sendBrowserPushNotification(
      {
        auth: "mock",
        createdAt: new Date(0).toISOString(),
        endpoint: "https://fcm.googleapis.com/fcm/send/dry-run",
        id: randomUUID(),
        p256dh: "mock",
        updatedAt: new Date(0).toISOString(),
        userAgent: "test",
        userId: randomUUID(),
      },
      { body: "dry run", title: "dry run" },
    );

    assert.equal(email.providerMessageId, "mock-email-event-1");
    assert.equal(sms.providerMessageId, "mock-sms-event-1");
    assert.equal(push.status, "sent");
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv("EMAIL_PROVIDER", previous.emailProvider);
    restoreEnv("NODE_ENV", previous.nodeEnv);
    restoreEnv("SMS_PROVIDER", previous.smsProvider);
    restoreEnv("WEB_PUSH_DELIVERY_MODE", previous.webPushMode);
  }
});

test("production rejects mock SMS and cron steps isolate partial failures", async () => {
  const previousProvider = process.env.SMS_PROVIDER;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    setEnv("NODE_ENV", "production");
    process.env.SMS_PROVIDER = "mock";
    const readiness = getSmsDeliveryReadiness();
    assert.equal(readiness.configured, false);
    await assert.rejects(
      sendSmsMessage({ body: "no send", to: "01000000000" }),
      /must not be used in production/u,
    );
  } finally {
    restoreEnv("SMS_PROVIDER", previousProvider);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }

  const calls: string[] = [];
  const result = await runCronSteps({
    first: async () => {
      calls.push("first");
      return { ok: true };
    },
    second: async () => {
      calls.push("second");
      throw new Error("expected failure");
    },
    third: async () => {
      calls.push("third");
      return { ok: true };
    },
  });

  assert.deepEqual(calls.sort(), ["first", "second", "third"]);
  assert.equal(result.failed, 1);
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.data).sort(), ["first", "third"]);
});

test("review request outbox plans are deterministic and keep tokens out of metadata", () => {
  const input = {
    applicationId: randomUUID(),
    programId: randomUUID(),
    programTitle: "Dry-run program",
    recipientEmail: "reviewer@nuvio.invalid",
    recipientName: "Reviewer",
    reminder: true,
    requestCount: 2,
    requestId: randomUUID(),
    writeUrl: "/reviews/new?token=dry-run-token",
  };
  const first = buildReviewRequestNotificationPlan(input);
  const retried = buildReviewRequestNotificationPlan(input);

  assert.ok(first);
  assert.deepEqual(first, retried);
  assert.match(first.emailEvent.dedupeKey ?? "", /:2$/u);
  assert.match(first.emailEvent.href ?? "", /dry-run-token/u);
  assert.doesNotMatch(
    JSON.stringify(first.emailEvent.metadata),
    /dry-run-token/u,
  );
});

test("production cron registry contains four isolated delivery jobs", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as { crons: Array<{ path: string; schedule: string }> };
  assert.deepEqual(config.crons, [
    { path: "/api/cron/process-notifications", schedule: "20 0 * * *" },
    { path: "/api/cron/process-program-reminders", schedule: "0 0 * * *" },
    { path: "/api/cron/process-scheduled-messages", schedule: "10 0 * * *" },
    { path: "/api/cron/process-review-requests", schedule: "15 0 * * *" },
  ]);
  assert.equal(
    isSupportedBrowserPushEndpoint(
      "https://fcm.googleapis.com/fcm/send/valid-endpoint",
    ),
    true,
  );
});

async function createMigratedFixtureDatabase() {
  const db = await createFixtureDatabase();
  await db.exec(additiveMigration);
  await db.exec(enforcementMigration);
  return db;
}

async function createFixtureDatabase() {
  const db = new PGlite();
  await db.exec(`
    create type public.notification_event_status as enum (
      'pending', 'processing', 'sent', 'failed', 'skipped'
    );
    create type public.notification_channel as enum (
      'inApp', 'email', 'sms', 'kakao', 'browserPush'
    );
    create type public.message_delivery_status as enum (
      'draft', 'scheduled', 'processing', 'sent', 'failed'
    );

    create table public.notification_events (
      id uuid primary key,
      event_type text not null,
      channel public.notification_channel not null default 'inApp',
      status public.notification_event_status not null default 'pending',
      title text not null,
      body text not null,
      dedupe_key text,
      delivered_at timestamptz,
      attempt_count integer not null default 0,
      max_attempts integer not null default 5,
      last_attempt_at timestamptz,
      next_attempt_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index notification_events_dedupe_key_unique_idx
      on public.notification_events(dedupe_key)
      where dedupe_key is not null;

    create table public.scheduled_messages (
      id uuid primary key,
      delivery_status public.message_delivery_status not null default 'draft',
      scheduled_for timestamptz,
      sent_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.user_notifications (
      id uuid primary key,
      user_id uuid not null,
      type text not null,
      title text not null,
      body text not null,
      dedupe_key text
    );
    create unique index user_notifications_dedupe_key_unique_idx
      on public.user_notifications(dedupe_key)
      where dedupe_key is not null;

    create table public.push_subscriptions (
      id uuid primary key,
      user_id uuid not null,
      endpoint text not null unique,
      p256dh text not null,
      auth text not null,
      updated_at timestamptz not null default now()
    );
  `);
  return db;
}

function claimScheduledMessage(db: PGlite, id: string) {
  return db.query<{ attempt_count: number; claim_token: string }>(
    `update public.scheduled_messages
     set
       attempt_count = attempt_count + 1,
       claimed_at = now(),
       claim_token = gen_random_uuid(),
       delivery_status = 'processing',
       last_attempt_at = now(),
       next_attempt_at = null
     where id = $1
       and delivery_status = 'scheduled'
       and (next_attempt_at is null or next_attempt_at <= now())
     returning attempt_count, claim_token::text`,
    [id],
  );
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function setEnv(name: string, value: string) {
  process.env[name] = value;
}
