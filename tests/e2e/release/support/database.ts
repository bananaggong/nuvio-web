import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import {
  assertReleaseE2EPrefix,
  getReleaseE2EDatabaseUrl,
  getReleaseE2ESupabaseConfig,
} from "./environment";
import type { ReleaseE2EState } from "./state";

type SqlClient = ReturnType<typeof postgres>;

const persistentRateLimitScopes = [
  "host-application-status:update",
  "host-reviews:list",
  "host-reviews-patch",
  "me-reviews:eligibility",
  "program-application:create",
  "review:create",
];

export function createReleaseE2ESql(): SqlClient {
  return postgres(getReleaseE2EDatabaseUrl(), { max: 1, prepare: false });
}

export function createReleaseE2EAdminClient() {
  const { serviceRoleKey, url } = getReleaseE2ESupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createReleaseE2EFixture(): Promise<ReleaseE2EState> {
  const suffix = `${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`.toUpperCase();
  const runId = suffix.toLowerCase().replaceAll("_", "-");
  const prefix = `NUVIO_E2E_${suffix}`;
  assertReleaseE2EPrefix(prefix);

  const mailboxToken = runId.replaceAll("-", "");
  const hostEmail = `nuvio.release.e2e.host.${mailboxToken}@gmail.com`;
  const participantEmail = `nuvio.release.e2e.participant.${mailboxToken}@gmail.com`;
  const password = `Nuvio!${randomBytes(12).toString("base64url")}`;
  const villageSlug = `release-e2e-${runId}`;
  const programSlug = `${villageSlug}-journey`;
  const admin = createReleaseE2EAdminClient();
  const createdHost = await admin.auth.admin.createUser({
    email: hostEmail,
    email_confirm: true,
    password,
    user_metadata: { e2e_prefix: prefix },
  });
  if (createdHost.error || !createdHost.data.user) {
    throw new Error(createdHost.error?.message ?? "Failed to create the release E2E host.");
  }

  const hostUserId = createdHost.data.user.id;
  const sql = createReleaseE2ESql();
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        insert into public.profiles (
          id, email, full_name, display_name, role, onboarding_intent,
          onboarding_completed_at, phone, contact_email, address,
          show_host_center_nav, updated_at
        ) values (
          ${hostUserId}::uuid, ${hostEmail}, ${`${prefix} Host`}, ${`${prefix} Host`},
          'partner', 'host', now(), '010-9000-0001', ${hostEmail},
          'Seoul E2E District', true, now()
        )
        on conflict (id) do update set
          email = excluded.email,
          full_name = excluded.full_name,
          display_name = excluded.display_name,
          role = excluded.role,
          onboarding_intent = excluded.onboarding_intent,
          onboarding_completed_at = excluded.onboarding_completed_at,
          phone = excluded.phone,
          contact_email = excluded.contact_email,
          address = excluded.address,
          show_host_center_nav = excluded.show_host_center_nav,
          updated_at = now()
      `;

      const [village] = await transaction`
        insert into public.villages (
          slug, name, region, city, tagline, summary, description,
          hero_image_url, profile_image_url, logo_text, brand_color,
          accent_color, contact_email, contact_phone, address,
          program_ids, links, sections, published_at, created_by
        ) values (
          ${villageSlug}, ${`${prefix} Channel`}, 'Seoul', 'E2E District',
          ${`${prefix} channel tagline`}, ${`${prefix} channel summary`},
          ${`${prefix} channel description`}, '/brand/nuvio-social-preview.png',
          '/brand/nuvio-symbol.svg', ${prefix}, '#0f766e', '#fe701e',
          ${hostEmail}, '010-9000-0001', 'Seoul E2E District',
          '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, now(), ${hostUserId}::uuid
        )
        returning id
      `;

      await transaction`
        insert into public.host_village_memberships (
          village_id, user_id, account_email, role, status,
          granted_by, activated_at
        ) values (
          ${village.id}::uuid, ${hostUserId}::uuid, ${hostEmail}, 'owner',
          'active', ${hostUserId}::uuid, now()
        )
      `;

      const [program] = await transaction`
        insert into public.programs (
          title, slug, region, city, is_global, summary, description,
          theme, categories, hashtags, period_key, activity_start,
          activity_end, recruit_start, recruit_end, target, capacity,
          announcement, subsidy_label, subsidy_amount, fee, applicants,
          status, source_name, source_url, apply_url, phone, contact_email,
          image_url, gallery, badges, body, village_id, published_at, created_by
        ) values (
          ${`${prefix} Local Journey`}, ${programSlug}, 'Seoul', 'E2E District',
          false, ${`${prefix} program summary`}, ${`${prefix} program description`},
          'local', '["local"]'::jsonb, ${JSON.stringify([prefix])}::jsonb,
          'under4', current_date + 40, current_date + 42,
          current_date - 1, current_date + 30, 'Release E2E participants',
          '8 people', 'Release E2E announcement', 'Self funded', 0, 'Free', 0,
          'open', ${`${prefix} Source`}, ${`/programs/${programSlug}`},
          ${`/programs/${programSlug}/apply`}, '010-9000-0001', ${hostEmail},
          '/brand/nuvio-social-preview.png', '[]'::jsonb, '[]'::jsonb,
          ${JSON.stringify([`${prefix} program body`])}::jsonb,
          ${village.id}::uuid, now(), ${hostUserId}::uuid
        )
        returning id
      `;

      await transaction`
        update public.villages
        set program_ids = ${JSON.stringify([program.id, programSlug])}::jsonb,
            updated_at = now()
        where id = ${village.id}::uuid
      `;
    });

    const [village] = await sql`
      select id from public.villages where slug = ${villageSlug} limit 1
    `;
    const [program] = await sql`
      select id from public.programs where slug = ${programSlug} limit 1
    `;
    if (!village?.id || !program?.id) {
      throw new Error("Release E2E fixture rows were not created.");
    }

    return {
      boardPostId: `${villageSlug}-board-post`,
      host: { email: hostEmail, password, userId: hostUserId },
      hostStoragePath: "test-results/release-e2e-runtime/host-storage.json",
      participant: { email: participantEmail, password },
      participantStoragePath: "test-results/release-e2e-runtime/participant-storage.json",
      prefix,
      program: { id: String(program.id), slug: programSlug, title: `${prefix} Local Journey` },
      reviewBody: `${prefix} review body with enough detail for release verification.`,
      runId,
      startedAt: new Date().toISOString(),
      village: { id: String(village.id), name: `${prefix} Channel`, slug: villageSlug },
    };
  } catch (error) {
    await admin.auth.admin.deleteUser(hostUserId).catch(() => undefined);
    throw error;
  } finally {
    await sql.end();
  }
}

export async function cleanupReleaseE2EFixture(state: ReleaseE2EState): Promise<void> {
  assertReleaseE2EPrefix(state.prefix);
  const sql = createReleaseE2ESql();
  const userIds = [state.host.userId, state.participant.userId].filter(
    (value): value is string => Boolean(value),
  );
  const applicationIds = state.applicationId ? [state.applicationId] : [];
  const entityIds = [
    state.applicationId,
    state.galleryId,
    state.magazineId,
    state.program.id,
    state.reviewId,
    state.village.id,
  ].filter((value): value is string => Boolean(value));
  const identityHashes = buildPersistentRateLimitIdentityHashes(state);

  try {
    await sql.begin(async (transaction) => {
      await transaction`select set_config('app.review_hard_delete_allowed', 'true', true)`;
      await transaction`
        delete from public.notification_events
        where recipient_user_id = any(${userIds}::uuid[])
           or recipient = any(${[state.host.email, state.participant.email]}::text[])
           or metadata->>'applicationId' = any(${applicationIds}::text[])
           or metadata->>'programId' = ${state.program.id}
      `;
      await transaction`
        delete from public.admin_audit_logs
        where actor_id = any(${userIds}::uuid[])
           or entity_id = any(${entityIds}::text[])
      `;
      await transaction`
        delete from public.api_rate_limits
        where identity_hash = any(${identityHashes}::text[])
           and scope = any(${persistentRateLimitScopes}::text[])
      `;
      await transaction`
        delete from public.reviews
        where program_id = ${state.program.id}::uuid
           or application_id = any(${applicationIds}::uuid[])
           or body like ${`${state.prefix}%`}
      `;
      await transaction`
        delete from public.village_media_contents where village_slug = ${state.village.slug}
      `;
      await transaction`
        delete from public.village_page_sections where village_slug = ${state.village.slug}
      `;
      await transaction`delete from public.programs where id = ${state.program.id}::uuid`;
      await transaction`delete from public.villages where id = ${state.village.id}::uuid`;
      await transaction`delete from public.profiles where id = any(${userIds}::uuid[])`;
    });
  } finally {
    await sql.end();
  }

  const admin = createReleaseE2EAdminClient();
  for (const userId of userIds) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error && !/not found/iu.test(result.error.message)) throw result.error;
  }
}

export async function countReleaseE2ERemnants(
  state: ReleaseE2EState,
): Promise<Record<string, number>> {
  assertReleaseE2EPrefix(state.prefix);
  const sql = createReleaseE2ESql();
  const userIds = [state.host.userId, state.participant.userId].filter(
    (value): value is string => Boolean(value),
  );
  const applicationIds = state.applicationId ? [state.applicationId] : [];
  const entityIds = [
    state.applicationId,
    state.galleryId,
    state.magazineId,
    state.program.id,
    state.reviewId,
    state.village.id,
  ].filter((value): value is string => Boolean(value));
  const identityHashes = buildPersistentRateLimitIdentityHashes(state);
  try {
    const [counts] = await sql`
      select
        (select count(*)::int from auth.users
          where email in (${state.host.email}, ${state.participant.email})) as auth_users,
        (select count(*)::int from public.profiles
          where email in (${state.host.email}, ${state.participant.email})) as profiles,
        (select count(*)::int from public.villages
          where id = ${state.village.id}::uuid or slug = ${state.village.slug}) as villages,
        (select count(*)::int from public.host_village_memberships
          where village_id = ${state.village.id}::uuid) as memberships,
        (select count(*)::int from public.programs
          where id = ${state.program.id}::uuid or slug = ${state.program.slug}) as programs,
        (select count(*)::int from public.program_applications
          where program_id = ${state.program.id}::uuid) as applications,
        (select count(*)::int from public.application_status_events
          where application_id = any(${applicationIds}::uuid[])) as application_events,
        (select count(*)::int from public.reviews
          where program_id = ${state.program.id}::uuid or body like ${`${state.prefix}%`}) as reviews,
        (select count(*)::int from public.review_requests
          where application_id = any(${applicationIds}::uuid[])) as review_requests,
        (select count(*)::int from public.review_content_versions
          where review_id = ${state.reviewId ?? null}::uuid) as review_versions,
        (select count(*)::int from public.village_media_contents
          where village_slug = ${state.village.slug}) as media,
        (select count(*)::int from public.village_page_sections
          where village_slug = ${state.village.slug}) as sections,
        (select count(*)::int from public.notification_events
          where recipient_user_id = any(${userIds}::uuid[])
             or recipient in (${state.host.email}, ${state.participant.email})
             or metadata->>'programId' = ${state.program.id}) as notifications,
        (select count(*)::int from public.admin_audit_logs
          where actor_id = any(${userIds}::uuid[])
             or entity_id = any(${entityIds}::text[])) as audit_logs,
        (select count(*)::int from public.api_rate_limits
          where identity_hash = any(${identityHashes}::text[])
            and scope = any(${persistentRateLimitScopes}::text[])) as rate_limits
    `;
    return Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [key, Number(value)]),
    );
  } finally {
    await sql.end();
  }
}

function buildPersistentRateLimitIdentityHashes(state: ReleaseE2EState): string[] {
  const hashes = new Set<string>();
  const add = (scope: string, identity: string) => {
    const normalizedIdentity = identity.trim().toLowerCase().slice(0, 240) || "unknown";
    hashes.add(
      createHash("sha256").update(`${scope}:${normalizedIdentity}`).digest("hex"),
    );
  };

  for (const userId of [state.host.userId, state.participant.userId]) {
    if (!userId) continue;
    for (const scope of persistentRateLimitScopes) add(scope, userId);
  }
  if (state.participant.userId) add("review:create", `${state.participant.userId}:null`);
  return [...hashes];
}
