import { createHash, randomBytes } from "node:crypto";
import type postgres from "postgres";
import {
  createReleaseE2EAdminClient,
  createReleaseE2ESql,
} from "../../release/support/database";
import { assertReleaseE2EPrefix } from "../../release/support/environment";
import type {
  SecurityAccountKey,
  SecurityE2EAccount,
  SecurityE2EState,
  SecurityTenantFixture,
} from "./state";

const accountSpecs: Array<{
  key: SecurityAccountKey;
  role: SecurityE2EAccount["role"];
}> = [
  { key: "memberA", role: "user" },
  { key: "memberB", role: "user" },
  { key: "hostA", role: "partner" },
  { key: "hostB", role: "partner" },
  { key: "admin", role: "admin" },
];

const persistentRateLimitScopes = [
  "host-application-status:update",
  "host-program-asset:upload",
  "host-villages-post",
  "me-avatar:upload",
  "me-review:update",
  "program-application:create",
];

export async function createSecurityE2EFixture(): Promise<SecurityE2EState> {
  if (process.env.NUVIO_SECURITY_E2E_CONFIRM_TEST_DATA !== "1") {
    throw new Error(
      "Set NUVIO_SECURITY_E2E_CONFIRM_TEST_DATA=1 to confirm isolated prefixed fixture writes.",
    );
  }

  const suffix = `${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`.toUpperCase();
  const runId = suffix.toLowerCase().replaceAll("_", "-");
  const prefix = `NUVIO_E2E_SECURITY_${suffix}`;
  assertReleaseE2EPrefix(prefix);
  const password = `Nuvio!${randomBytes(12).toString("base64url")}`;
  const admin = createReleaseE2EAdminClient();
  const accounts = {} as Record<SecurityAccountKey, SecurityE2EAccount>;

  try {
    for (const spec of accountSpecs) {
      const email = `nuvio.security.${spec.key.toLowerCase()}.${runId}@example.com`;
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { e2e_prefix: prefix },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? `Failed to create ${spec.key}.`);
      }
      accounts[spec.key] = {
        email,
        password,
        role: spec.role,
        storagePath: `test-results/security-e2e-runtime/${spec.key}-storage.json`,
        userId: created.data.user.id,
      };
    }

    const sql = createReleaseE2ESql();
    try {
      const entities = await sql.begin(async (transaction) => {
        for (const [key, account] of Object.entries(accounts)) {
          await transaction`
            insert into public.profiles (
              id, email, full_name, display_name, role, onboarding_intent,
              onboarding_completed_at, phone, contact_email, address,
              show_host_center_nav, updated_at
            ) values (
              ${account.userId}::uuid, ${account.email}, ${`${prefix} ${key}`},
              ${`${prefix} ${key}`}, ${account.role},
              ${account.role === "partner" ? "host" : "participant"}, now(),
              '010-9100-0000', ${account.email}, 'Security E2E District',
              ${account.role !== "user"}, now()
            )
          `;
        }

        const villageA = await createVillage(transaction, prefix, runId, "a", accounts.hostA);
        const villageB = await createVillage(transaction, prefix, runId, "b", accounts.hostB);
        const tenantA = await createTenantEntities(
          transaction,
          prefix,
          "A",
          villageA,
          accounts.hostA,
          accounts.memberA,
        );
        const tenantB = await createTenantEntities(
          transaction,
          prefix,
          "B",
          villageB,
          accounts.hostB,
          accounts.memberB,
        );

        return { tenantA, tenantB };
      });

      return {
        accounts,
        boardPostId: `security-${runId}-board-post`,
        prefix,
        runId,
        startedAt: new Date().toISOString(),
        tenantA: entities.tenantA,
        tenantB: entities.tenantB,
      };
    } finally {
      await sql.end();
    }
  } catch (error) {
    await deleteAuthUsers(Object.values(accounts).map((account) => account.userId));
    throw error;
  }
}

export async function cleanupSecurityE2EFixture(state: SecurityE2EState): Promise<void> {
  assertReleaseE2EPrefix(state.prefix);
  const sql = createReleaseE2ESql();
  const userIds = Object.values(state.accounts).map((account) => account.userId);
  const emails = Object.values(state.accounts).map((account) => account.email);
  const villageIds = [state.tenantA.villageId, state.tenantB.villageId];
  const villageSlugs = [state.tenantA.villageSlug, state.tenantB.villageSlug];
  const programIds = [state.tenantA.programId, state.tenantB.programId];
  const applicationIds = [state.tenantA.applicationId, state.tenantB.applicationId];
  const reviewIds = [state.tenantA.reviewId, state.tenantB.reviewId];
  const inquiryIds = [state.tenantA.inquiryId, state.tenantB.inquiryId];
  const entityIds = [
    ...villageIds,
    ...programIds,
    ...applicationIds,
    ...reviewIds,
    ...inquiryIds,
  ];
  const identityHashes = buildPersistentIdentityHashes(state);

  try {
    await sql.begin(async (transaction) => {
      await transaction`select set_config('app.review_hard_delete_allowed', 'true', true)`;
      await transaction`
        delete from public.notification_events
        where recipient_user_id = any(${userIds}::uuid[])
           or recipient = any(${emails}::text[])
           or metadata->>'programId' = any(${programIds}::text[])
           or metadata->>'applicationId' = any(${applicationIds}::text[])
           or metadata->>'inquiryId' = any(${inquiryIds}::text[])
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
        delete from public.village_media_contents where village_slug = any(${villageSlugs}::text[])
      `;
      await transaction`
        delete from public.village_page_sections where village_slug = any(${villageSlugs}::text[])
      `;
      await transaction`
        delete from public.program_inquiry_messages where inquiry_id = any(${inquiryIds}::uuid[])
      `;
      await transaction`delete from public.program_inquiries where id = any(${inquiryIds}::uuid[])`;
      await transaction`delete from public.reviews where id = any(${reviewIds}::uuid[])`;
      await transaction`delete from public.programs where id = any(${programIds}::uuid[])`;
      await transaction`delete from public.villages where id = any(${villageIds}::uuid[])`;
      await transaction`delete from public.profiles where id = any(${userIds}::uuid[])`;
    });
  } finally {
    await sql.end();
  }

  await deleteAuthUsers(userIds);
}

export async function countSecurityE2ERemnants(
  state: SecurityE2EState,
): Promise<Record<string, number>> {
  assertReleaseE2EPrefix(state.prefix);
  const sql = createReleaseE2ESql();
  const userIds = Object.values(state.accounts).map((account) => account.userId);
  const emails = Object.values(state.accounts).map((account) => account.email);
  const villageIds = [state.tenantA.villageId, state.tenantB.villageId];
  const villageSlugs = [state.tenantA.villageSlug, state.tenantB.villageSlug];
  const programIds = [state.tenantA.programId, state.tenantB.programId];
  const applicationIds = [state.tenantA.applicationId, state.tenantB.applicationId];
  const reviewIds = [state.tenantA.reviewId, state.tenantB.reviewId];
  const inquiryIds = [state.tenantA.inquiryId, state.tenantB.inquiryId];
  const messageIds = [state.tenantA.inquiryMessageId, state.tenantB.inquiryMessageId];
  const identityHashes = buildPersistentIdentityHashes(state);

  try {
    const [counts] = await sql`
      select
        (select count(*)::int from auth.users where email = any(${emails}::text[])) as auth_users,
        (select count(*)::int from public.profiles where id = any(${userIds}::uuid[])) as profiles,
        (select count(*)::int from public.villages where id = any(${villageIds}::uuid[])) as villages,
        (select count(*)::int from public.host_village_memberships where village_id = any(${villageIds}::uuid[])) as memberships,
        (select count(*)::int from public.programs where id = any(${programIds}::uuid[])) as programs,
        (select count(*)::int from public.program_applications where id = any(${applicationIds}::uuid[])) as applications,
        (select count(*)::int from public.application_status_events where application_id = any(${applicationIds}::uuid[])) as application_events,
        (select count(*)::int from public.reviews where id = any(${reviewIds}::uuid[])) as reviews,
        (select count(*)::int from public.review_content_versions where review_id = any(${reviewIds}::uuid[])) as review_versions,
        (select count(*)::int from public.review_status_events where review_id = any(${reviewIds}::uuid[])) as review_events,
        (select count(*)::int from public.review_requests where application_id = any(${applicationIds}::uuid[])) as review_requests,
        (select count(*)::int from public.program_inquiries where id = any(${inquiryIds}::uuid[])) as inquiries,
        (select count(*)::int from public.program_inquiry_messages where id = any(${messageIds}::uuid[]) or inquiry_id = any(${inquiryIds}::uuid[])) as inquiry_messages,
        (select count(*)::int from public.village_media_contents where village_slug = any(${villageSlugs}::text[])) as media,
        (select count(*)::int from public.village_page_sections where village_slug = any(${villageSlugs}::text[])) as sections,
        (select count(*)::int from public.notification_events where recipient_user_id = any(${userIds}::uuid[])) as notifications,
        (select count(*)::int from public.admin_audit_logs where actor_id = any(${userIds}::uuid[])) as audit_logs,
        (select count(*)::int from public.api_rate_limits where identity_hash = any(${identityHashes}::text[])) as rate_limits
    `;
    return Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [key, Number(value)]),
    );
  } finally {
    await sql.end();
  }
}

async function createVillage(
  transaction: postgres.TransactionSql,
  prefix: string,
  runId: string,
  suffix: "a" | "b",
  host: SecurityE2EAccount,
) {
  const slug = `security-e2e-${runId}-${suffix}`;
  const [village] = await transaction`
    insert into public.villages (
      slug, name, region, city, tagline, summary, description,
      hero_image_url, profile_image_url, logo_text, brand_color,
      accent_color, contact_email, contact_phone, address,
      program_ids, links, sections, published_at, created_by
    ) values (
      ${slug}, ${`${prefix} Channel ${suffix.toUpperCase()}`}, 'Seoul',
      'Security District', ${`${prefix} tagline ${suffix}`},
      ${`${prefix} summary ${suffix}`}, ${`${prefix} description ${suffix}`},
      '/brand/nuvio-social-preview.png', '/brand/nuvio-symbol.svg',
      ${`${prefix}-${suffix}`}, '#0f766e', '#fe701e', ${host.email},
      '010-9100-0000', 'Security E2E District', '[]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, now(), ${host.userId}::uuid
    ) returning id, name, slug
  `;
  await transaction`
    insert into public.host_village_memberships (
      village_id, user_id, account_email, role, status, granted_by, activated_at
    ) values (
      ${village.id}::uuid, ${host.userId}::uuid, ${host.email}, 'owner',
      'active', ${host.userId}::uuid, now()
    )
  `;
  return { id: String(village.id), name: String(village.name), slug: String(village.slug) };
}

async function createTenantEntities(
  transaction: postgres.TransactionSql,
  prefix: string,
  label: "A" | "B",
  village: { id: string; name: string; slug: string },
  host: SecurityE2EAccount,
  member: SecurityE2EAccount,
): Promise<SecurityTenantFixture> {
  const programSlug = `${village.slug}-journey`;
  const programTitle = `${prefix} Program ${label}`;
  const [program] = await transaction`
    insert into public.programs (
      title, slug, region, city, is_global, summary, description,
      theme, categories, hashtags, period_key, activity_start,
      activity_end, recruit_start, recruit_end, target, capacity,
      announcement, subsidy_label, subsidy_amount, fee, applicants,
      status, source_name, source_url, apply_url, phone, contact_email,
      image_url, gallery, badges, body, village_id, published_at, created_by
    ) values (
      ${programTitle}, ${programSlug}, 'Seoul', 'Security District', false,
      ${`${prefix} program summary ${label}`}, ${`${prefix} program description ${label}`},
      'local', '["local"]'::jsonb, ${JSON.stringify([prefix, label])}::jsonb,
      'under4', current_date - 10, current_date - 8, current_date - 40,
      current_date - 20, 'Security E2E participants', '8 people',
      'Security E2E announcement', 'Self funded', 0, 'Free', 0,
      'closed', ${`${prefix} Source ${label}`}, ${`/programs/${programSlug}`},
      ${`/programs/${programSlug}/apply`}, '010-9100-0000', ${host.email},
      '/brand/nuvio-social-preview.png', '[]'::jsonb, '[]'::jsonb,
      ${JSON.stringify([`${prefix} program body ${label}`])}::jsonb,
      ${village.id}::uuid, now(), ${host.userId}::uuid
    ) returning id
  `;
  await transaction`
    update public.villages
    set program_ids = ${JSON.stringify([program.id, programSlug])}::jsonb,
        updated_at = now()
    where id = ${village.id}::uuid
  `;

  const [application] = await transaction`
    insert into public.program_applications (
      program_id, applicant_name, email, phone, submitted_by, status,
      answers, consent_snapshot, submitted_at
    ) values (
      ${program.id}::uuid, ${`${prefix} Member ${label}`}, ${member.email},
      '010-9100-0001', ${member.userId}::uuid, 'completed',
      ${JSON.stringify({ marker: prefix, tenant: label })}::jsonb,
      ${JSON.stringify({ termsAgreed: true })}::jsonb, now()
    ) returning id
  `;

  const reviewBody = `${prefix} private review body ${label} with security details.`;
  const [review] = await transaction`
    insert into public.reviews (
      application_id, program_id, village_slug, user_id, title, category,
      author_name, excerpt, body, images, rating, source, status, submitted_at
    ) values (
      ${application.id}::uuid, ${program.id}::uuid, ${village.slug},
      ${member.userId}::uuid, ${`${prefix} Review ${label}`}, 'trip',
      ${`Member ${label}`}, ${`${prefix} review excerpt ${label}`}, ${reviewBody},
      '[]'::jsonb, 5, 'participant', 'pending', now()
    ) returning id
  `;

  const [inquiry] = await transaction`
    insert into public.program_inquiries (
      village_id, program_id, program_title, contact_name, contact_email,
      contact_phone, title, message, status, answers, source, submitted_by
    ) values (
      ${village.id}::uuid, ${program.id}::uuid, ${programTitle},
      ${`${prefix} Member ${label}`}, ${member.email}, '010-9100-0001',
      ${`${prefix} Inquiry ${label}`}, ${`${prefix} private inquiry ${label}`},
      'new', ${JSON.stringify({ marker: prefix })}::jsonb, 'program',
      ${member.userId}::uuid
    ) returning id
  `;
  const [message] = await transaction`
    insert into public.program_inquiry_messages (
      inquiry_id, sender_role, sender_id, sender_name, message
    ) values (
      ${inquiry.id}::uuid, 'user', ${member.userId}::uuid,
      ${`${prefix} Member ${label}`}, ${`${prefix} private message ${label}`}
    ) returning id
  `;

  return {
    applicationId: String(application.id),
    inquiryId: String(inquiry.id),
    inquiryMessageId: String(message.id),
    programId: String(program.id),
    programSlug,
    programTitle,
    reviewBody,
    reviewId: String(review.id),
    villageId: village.id,
    villageName: village.name,
    villageSlug: village.slug,
  };
}

async function deleteAuthUsers(userIds: string[]): Promise<void> {
  const admin = createReleaseE2EAdminClient();
  for (const userId of userIds) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error && !/not found/iu.test(result.error.message)) throw result.error;
  }
}

function buildPersistentIdentityHashes(state: SecurityE2EState): string[] {
  const hashes = new Set<string>();
  for (const account of Object.values(state.accounts)) {
    for (const scope of persistentRateLimitScopes) {
      const identity = account.userId.trim().toLowerCase().slice(0, 240);
      hashes.add(createHash("sha256").update(`${scope}:${identity}`).digest("hex"));
    }
  }
  return [...hashes];
}
