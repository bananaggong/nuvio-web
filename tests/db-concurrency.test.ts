import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { isProgramApplicationDuplicateDatabaseError } from "@/lib/host-application-db";
import { isReviewApplicationDuplicateDatabaseError } from "@/lib/review-db";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260712013000_preflight_core_integrity_constraints.sql",
    import.meta.url,
  ),
  "utf8",
);

test("integrity migration fails before DDL when legacy rows are unsafe", async () => {
  const db = await createFixtureDatabase();

  try {
    const profileId = randomUUID();
    const programId = randomUUID();
    await db.query("insert into public.profiles (id) values ($1)", [profileId]);
    await db.query("insert into public.programs (id) values ($1)", [programId]);
    await db.query(
      `insert into public.program_applications
        (id, program_id, email, submitted_by)
       values ($1, $2, 'duplicate@example.com', $3),
              ($4, $2, 'duplicate@example.com', null)`,
      [randomUUID(), programId, profileId, randomUUID()],
    );

    await assert.rejects(
      db.exec(migration),
      /NUVIO integrity preflight failed/u,
    );
    const index = await db.query<{ relation: string | null }>(
      "select to_regclass('public.program_applications_program_normalized_email_uidx')::text as relation",
    );
    assert.equal(index.rows[0]?.relation, null);
  } finally {
    await db.close();
  }
});

test("parallel application double-clicks and retries create one normalized row", async () => {
  const db = await createMigratedFixtureDatabase();

  try {
    const profileId = randomUUID();
    const programId = randomUUID();
    await db.query("insert into public.profiles (id) values ($1)", [profileId]);
    await db.query("insert into public.programs (id) values ($1)", [programId]);

    const attempts = await Promise.allSettled(
      Array.from({ length: 16 }, () =>
        db.query(
          `insert into public.program_applications
            (id, program_id, email, submitted_by)
           values ($1, $2, 'retry@example.com', $3)`,
          [randomUUID(), programId, profileId],
        ),
      ),
    );
    const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");
    const rows = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.program_applications where program_id = $1",
      [programId],
    );

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 15);
    assert.equal(rows.rows[0]?.count, 1);
    assert.ok(
      rejected.every(
        (attempt) =>
          attempt.status === "rejected" &&
          isProgramApplicationDuplicateDatabaseError(attempt.reason),
      ),
    );
  } finally {
    await db.close();
  }
});

test("parallel review submissions retain one active review per application", async () => {
  const db = await createMigratedFixtureDatabase();

  try {
    const profileId = randomUUID();
    const programId = randomUUID();
    const applicationId = randomUUID();
    await db.query("insert into public.profiles (id) values ($1)", [profileId]);
    await db.query("insert into public.programs (id) values ($1)", [programId]);
    await db.query(
      `insert into public.program_applications
        (id, program_id, email, submitted_by)
       values ($1, $2, 'reviewer@example.com', $3)`,
      [applicationId, programId, profileId],
    );

    const firstWave = await insertReviewsInParallel(db, applicationId, 12);
    assert.equal(firstWave.fulfilled, 1);
    assert.equal(firstWave.uniqueViolations, 11);

    await db.query(
      "update public.reviews set status = 'deleted' where application_id = $1",
      [applicationId],
    );
    const retryWave = await insertReviewsInParallel(db, applicationId, 12);
    assert.equal(retryWave.fulfilled, 1);
    assert.equal(retryWave.uniqueViolations, 11);

    const counts = await db.query<{ active_count: number; total_count: number }>(
      `select
         count(*) filter (where status <> 'deleted')::integer as active_count,
         count(*)::integer as total_count
       from public.reviews
       where application_id = $1`,
      [applicationId],
    );
    assert.deepEqual(counts.rows[0], { active_count: 1, total_count: 2 });
  } finally {
    await db.close();
  }
});

test("channel membership, media source, and board IDs reject parallel duplicates", async () => {
  const db = await createMigratedFixtureDatabase();

  try {
    const villageId = randomUUID();
    const userId = randomUUID();
    const membershipAttempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        db.query(
          `insert into public.host_village_memberships
            (id, village_id, user_id, account_email, status)
           values ($1, $2, $3, 'host@example.com', 'active')`,
          [randomUUID(), villageId, userId],
        ),
      ),
    );
    assert.equal(
      membershipAttempts.filter((attempt) => attempt.status === "fulfilled").length,
      1,
    );
    await assert.rejects(
      db.query(
        `insert into public.host_village_memberships
          (id, village_id, user_id, account_email, status)
         values ($1, $2, null, 'missing-user@example.com', 'active')`,
        [randomUUID(), randomUUID()],
      ),
      /host_village_memberships_active_user_required_chk/u,
    );

    const mediaAttempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        db.query(
          `insert into public.village_media_contents
            (id, village_slug, provider, source_url)
           values ($1, 'boseong', 'youtube', 'https://youtu.be/example/')`,
          [randomUUID()],
        ),
      ),
    );
    assert.equal(
      mediaAttempts.filter((attempt) => attempt.status === "fulfilled").length,
      1,
    );

    await assert.rejects(
      db.query(
        `insert into public.village_page_sections
          (id, page_key, section_key, draft_content, published_content)
         values (
           $1,
           'notice',
           'notice_index',
           '{"posts":[{"id":"same"},{"id":"same"}]}'::jsonb,
           '{"posts":[]}'::jsonb
         )`,
        [randomUUID()],
      ),
      /village_page_sections_board_draft_post_ids_chk/u,
    );
  } finally {
    await db.close();
  }
});

test("database duplicate errors map to domain duplicate errors", () => {
  assert.equal(
    isProgramApplicationDuplicateDatabaseError({
      code: "23505",
      constraint_name: "program_applications_program_normalized_email_uidx",
    }),
    true,
  );
  assert.equal(
    isReviewApplicationDuplicateDatabaseError({
      code: "23505",
      constraint_name: "reviews_application_id_unique_idx",
    }),
    true,
  );
  assert.equal(
    isProgramApplicationDuplicateDatabaseError({
      code: "23505",
      constraint_name: "program_applications_pkey",
    }),
    false,
  );
});

async function createMigratedFixtureDatabase() {
  const db = await createFixtureDatabase();
  await db.exec(migration);
  return db;
}

async function createFixtureDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;

    create table public.profiles (
      id uuid primary key
    );
    create table public.programs (
      id uuid primary key
    );
    create table public.program_runs (
      id uuid primary key,
      program_id uuid not null references public.programs(id)
    );
    create table public.program_applications (
      id uuid primary key,
      program_id uuid not null references public.programs(id),
      program_run_id uuid references public.program_runs(id),
      email text not null,
      submitted_by uuid references public.profiles(id) on delete set null
    );
    create index program_applications_program_lower_email_idx
      on public.program_applications(program_id, lower(email));
    create table public.reviews (
      id uuid primary key,
      application_id uuid references public.program_applications(id),
      program_id uuid references public.programs(id),
      program_run_id uuid references public.program_runs(id),
      status text not null default 'pending'
    );
    create unique index reviews_application_id_unique_idx
      on public.reviews(application_id)
      where application_id is not null and status <> 'deleted';
    create table public.review_requests (
      id uuid primary key,
      application_id uuid references public.program_applications(id),
      program_id uuid references public.programs(id),
      program_run_id uuid references public.program_runs(id)
    );
    create table public.application_status_events (
      id uuid primary key,
      application_id uuid references public.program_applications(id)
    );
    create table public.scheduled_messages (
      id uuid primary key,
      application_id uuid references public.program_applications(id)
    );
    create table public.participant_documents (
      id uuid primary key,
      application_id uuid references public.program_applications(id)
    );
    create table public.host_village_memberships (
      id uuid primary key,
      village_id uuid not null,
      user_id uuid,
      account_email text not null,
      status text not null default 'pending'
    );
    create unique index host_village_memberships_village_account_email_idx
      on public.host_village_memberships(village_id, account_email);
    create table public.village_media_contents (
      id uuid primary key,
      legacy_id text unique,
      village_slug text not null,
      provider text not null,
      source_url text not null
    );
    create table public.village_page_sections (
      id uuid primary key,
      village_slug text not null default 'boseong',
      page_key text not null,
      section_key text not null,
      draft_content jsonb not null default '{}'::jsonb,
      published_content jsonb
    );
  `);
  return db;
}

async function insertReviewsInParallel(
  db: PGlite,
  applicationId: string,
  count: number,
) {
  const attempts = await Promise.allSettled(
    Array.from({ length: count }, () =>
      db.query(
        `insert into public.reviews (id, application_id, status)
         values ($1, $2, 'pending')`,
        [randomUUID(), applicationId],
      ),
    ),
  );

  return {
    fulfilled: attempts.filter((attempt) => attempt.status === "fulfilled").length,
    uniqueViolations: attempts.filter(
      (attempt) =>
        attempt.status === "rejected" &&
        isReviewApplicationDuplicateDatabaseError(attempt.reason),
    ).length,
  };
}
