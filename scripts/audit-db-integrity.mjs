import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

const args = new Set(process.argv.slice(2));
const format = args.has("--json") ? "json" : "markdown";
const failOnFindings = args.has("--fail-on-findings");
const envDirectory = process.env.NUVIO_AUDIT_ENV_DIR || process.cwd();

loadEnvConfig(envDirectory);

const databaseUrl =
  process.env.NUVIO_AUDIT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NUVIO_AUDIT_DATABASE_URL, DATABASE_URL, or DIRECT_DATABASE_URL is required.",
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
    format === "json" ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report),
  );

  if (failOnFindings && report.summary.blockingFindingCount > 0) {
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
    throw new Error("Integrity audit refused to run outside a read-only transaction.");
  }

  const requiredTables = [
    "host_village_memberships",
    "profiles",
    "program_applications",
    "program_runs",
    "programs",
    "review_requests",
    "reviews",
    "village_media_contents",
    "village_page_sections",
  ];
  const tableRows = await tx`
    select requested.table_name, to_regclass('public.' || requested.table_name)::text as relation
    from unnest(${requiredTables}::text[]) as requested(table_name)
    order by requested.table_name
  `;
  const availableTables = new Set(
    tableRows.filter((row) => row.relation).map((row) => row.table_name),
  );
  const missingTables = requiredTables.filter((table) => !availableTables.has(table));
  const checks = [];
  const metrics = {};
  const diagnostics = {};

  addCheck(checks, {
    count: missingTables.length,
    details: missingTables.length > 0 ? { missingTables } : undefined,
    id: "required_tables_present",
    severity: "blocking",
  });

  if (hasAll(availableTables, ["program_applications", "profiles"])) {
    const [applicationMetrics] = await tx`
      select
        count(*)::bigint as total,
        count(*) filter (where submitted_by is null)::bigint as missing_submitted_by,
        count(*) filter (
          where submitted_by is null
            and exists (
              select 1
              from public.profiles profile
              where lower(btrim(profile.email)) = lower(btrim(program_applications.email))
            )
        )::bigint as resolvable_missing_submitted_by,
        count(*) filter (where email is distinct from lower(btrim(email)))::bigint
          as non_normalized_email
      from public.program_applications
    `;
    const [duplicateMetrics] = await tx`
      with duplicate_groups as (
        select count(*)::bigint as row_count
        from public.program_applications
        group by program_id, lower(btrim(email))
        having count(*) > 1
      )
      select
        count(*)::bigint as group_count,
        coalesce(sum(row_count - 1), 0)::bigint as excess_rows,
        coalesce(max(row_count), 0)::bigint as max_group_size
      from duplicate_groups
    `;

    metrics.programApplications = numericRecord(applicationMetrics);
    addCheck(checks, {
      count: toNumber(duplicateMetrics.group_count),
      details: {
        excessRows: toNumber(duplicateMetrics.excess_rows),
        maxGroupSize: toNumber(duplicateMetrics.max_group_size),
      },
      id: "program_application_normalized_email_duplicates",
      severity: "blocking",
    });
    addCheck(checks, {
      count: toNumber(applicationMetrics.missing_submitted_by),
      details: {
        resolvableByProfileEmail: toNumber(
          applicationMetrics.resolvable_missing_submitted_by,
        ),
      },
      id: "program_application_missing_submitted_by",
      severity: "blocking",
    });
    addCheck(checks, {
      count: toNumber(applicationMetrics.non_normalized_email),
      id: "program_application_non_normalized_email",
      severity: "warning",
    });

    const duplicateGroups = await tx`
      with duplicate_keys as (
        select program_id, lower(btrim(email)) as normalized_email
        from public.program_applications
        group by program_id, lower(btrim(email))
        having count(*) > 1
      ), group_summary as (
        select
          duplicate_keys.program_id,
          duplicate_keys.normalized_email,
          count(*)::bigint as row_count,
          count(*) filter (where application.submitted_by is null)::bigint
            as missing_submitted_by,
          count(distinct application.submitted_by)::bigint as submitted_by_variants,
          count(distinct application.program_run_id)::bigint as program_run_variants,
          count(distinct md5(application.answers::text))::bigint as answer_variants,
          array_agg(distinct application.status::text order by application.status::text)
            as statuses,
          extract(epoch from (max(application.submitted_at) - min(application.submitted_at)))::bigint
            as submitted_span_seconds
        from duplicate_keys
        join public.program_applications application
          on application.program_id = duplicate_keys.program_id
          and lower(btrim(application.email)) = duplicate_keys.normalized_email
        group by duplicate_keys.program_id, duplicate_keys.normalized_email
      )
      select
        row_number() over (order by submitted_span_seconds, row_count desc)::integer
          as group_number,
        row_count,
        missing_submitted_by,
        submitted_by_variants,
        program_run_variants,
        answer_variants,
        statuses,
        submitted_span_seconds,
        (
          select count(*)::bigint
          from public.application_status_events event
          join public.program_applications scoped on scoped.id = event.application_id
          where scoped.program_id = group_summary.program_id
            and lower(btrim(scoped.email)) = group_summary.normalized_email
        ) as status_event_count,
        (
          select count(*)::bigint
          from public.scheduled_messages message
          join public.program_applications scoped on scoped.id = message.application_id
          where scoped.program_id = group_summary.program_id
            and lower(btrim(scoped.email)) = group_summary.normalized_email
        ) as scheduled_message_count,
        (
          select count(*)::bigint
          from public.participant_documents document
          join public.program_applications scoped on scoped.id = document.application_id
          where scoped.program_id = group_summary.program_id
            and lower(btrim(scoped.email)) = group_summary.normalized_email
        ) as participant_document_count,
        (
          select count(*)::bigint
          from public.reviews review
          join public.program_applications scoped on scoped.id = review.application_id
          where scoped.program_id = group_summary.program_id
            and lower(btrim(scoped.email)) = group_summary.normalized_email
        ) as review_count,
        (
          select count(*)::bigint
          from public.review_requests request
          join public.program_applications scoped on scoped.id = request.application_id
          where scoped.program_id = group_summary.program_id
            and lower(btrim(scoped.email)) = group_summary.normalized_email
        ) as review_request_count
      from group_summary
      order by group_number
    `;
    const [missingOwnerDiagnostics] = await tx`
      with missing as (
        select
          application.id,
          (
            select count(*)
            from public.profiles profile
            where lower(btrim(profile.email)) = lower(btrim(application.email))
          ) as profile_match_count,
          exists (
            select 1
            from public.program_applications duplicate
            where duplicate.program_id = application.program_id
              and lower(btrim(duplicate.email)) = lower(btrim(application.email))
              and duplicate.id <> application.id
          ) as belongs_to_duplicate_group
        from public.program_applications application
        where application.submitted_by is null
      )
      select
        count(*) filter (where profile_match_count = 0)::bigint as no_profile_match,
        count(*) filter (where profile_match_count = 1)::bigint as unique_profile_match,
        count(*) filter (where profile_match_count > 1)::bigint as ambiguous_profile_match,
        count(*) filter (where belongs_to_duplicate_group)::bigint as in_duplicate_group
      from missing
    `;
    diagnostics.programApplicationDuplicateGroups = duplicateGroups.map(
      numericRecordExceptArrays,
    );
    diagnostics.programApplicationMissingOwners = numericRecord(
      missingOwnerDiagnostics,
    );
  }

  if (hasAll(availableTables, ["reviews"])) {
    const [reviewMetrics] = await tx`
      select count(*)::bigint as total from public.reviews
    `;
    const [activeDuplicates] = await tx`
      with duplicate_groups as (
        select count(*)::bigint as row_count
        from public.reviews
        where application_id is not null
          and status::text <> 'deleted'
        group by application_id
        having count(*) > 1
      )
      select
        count(*)::bigint as group_count,
        coalesce(sum(row_count - 1), 0)::bigint as excess_rows,
        coalesce(max(row_count), 0)::bigint as max_group_size
      from duplicate_groups
    `;
    const [allDuplicates] = await tx`
      with duplicate_groups as (
        select count(*)::bigint as row_count
        from public.reviews
        where application_id is not null
        group by application_id
        having count(*) > 1
      )
      select
        count(*)::bigint as group_count,
        coalesce(sum(row_count - 1), 0)::bigint as excess_rows
      from duplicate_groups
    `;

    metrics.reviews = numericRecord(reviewMetrics);
    addCheck(checks, {
      count: toNumber(activeDuplicates.group_count),
      details: {
        excessRows: toNumber(activeDuplicates.excess_rows),
        maxGroupSize: toNumber(activeDuplicates.max_group_size),
      },
      id: "active_review_application_duplicates",
      severity: "blocking",
    });
    addCheck(checks, {
      count: toNumber(allDuplicates.group_count),
      details: { excessRows: toNumber(allDuplicates.excess_rows) },
      id: "all_review_application_duplicates_including_deleted",
      severity: "info",
    });
  }

  await auditProgramRunScope(tx, availableTables, checks);
  await auditMemberships(tx, availableTables, checks, metrics);
  await auditMedia(tx, availableTables, checks, metrics, diagnostics);
  await auditBoardPosts(tx, availableTables, checks);
  await auditProtectionState(tx, checks);

  const foreignKeyAudit = await auditForeignKeys(tx);
  addCheck(checks, {
    count: foreignKeyAudit.orphanRowCount,
    details: {
      checkedConstraintCount: foreignKeyAudit.checkedConstraintCount,
      orphanConstraints: foreignKeyAudit.orphanConstraints,
    },
    id: "public_foreign_key_orphans",
    severity: "blocking",
  });

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

async function auditProgramRunScope(tx, availableTables, checks) {
  const scopes = [
    ["program_applications", "program_application_program_run_mismatch"],
    ["reviews", "review_program_run_mismatch"],
    ["review_requests", "review_request_program_run_mismatch"],
  ];

  for (const [table, id] of scopes) {
    if (!hasAll(availableTables, [table, "program_runs"])) continue;
    const quotedTable = quoteQualified("public", table);
    const [row] = await tx.unsafe(`
      select count(*)::bigint as count
      from ${quotedTable} scoped
      inner join public.program_runs run on run.id = scoped.program_run_id
      where scoped.program_run_id is not null
        and (scoped.program_id is null or scoped.program_id <> run.program_id)
    `);
    addCheck(checks, {
      count: toNumber(row.count),
      id,
      severity: "blocking",
    });
  }
}

async function auditMemberships(tx, availableTables, checks, metrics) {
  if (!availableTables.has("host_village_memberships")) return;

  const [membershipMetrics] = await tx`
    select
      count(*)::bigint as total,
      count(*) filter (
        where status::text = 'active' and user_id is null
      )::bigint as active_missing_user,
      count(*) filter (
        where account_email is distinct from lower(btrim(account_email))
      )::bigint as non_normalized_email
    from public.host_village_memberships
  `;
  const [normalizedEmailDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.host_village_memberships
      group by village_id, lower(btrim(account_email))
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;
  const [activeUserDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.host_village_memberships
      where status::text = 'active' and user_id is not null
      group by village_id, user_id
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;

  metrics.hostVillageMemberships = numericRecord(membershipMetrics);
  addCheck(checks, {
    count: toNumber(normalizedEmailDuplicates.group_count),
    details: { excessRows: toNumber(normalizedEmailDuplicates.excess_rows) },
    id: "host_membership_normalized_email_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(activeUserDuplicates.group_count),
    details: { excessRows: toNumber(activeUserDuplicates.excess_rows) },
    id: "host_membership_active_user_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(membershipMetrics.active_missing_user),
    id: "host_membership_active_missing_user",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(membershipMetrics.non_normalized_email),
    id: "host_membership_non_normalized_email",
    severity: "warning",
  });
}

async function auditMedia(tx, availableTables, checks, metrics, diagnostics) {
  if (!availableTables.has("village_media_contents")) return;

  const [mediaMetrics] = await tx`
    select count(*)::bigint as total from public.village_media_contents
  `;
  const [externalSourceDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.village_media_contents
      where provider in ('instagram', 'youtube', 'naver', 'video')
        and btrim(source_url) <> ''
      group by
        village_slug,
        provider,
        lower(regexp_replace(btrim(source_url), '/+$', ''))
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;
  const [legacyIdDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.village_media_contents
      where legacy_id is not null
      group by legacy_id
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;
  const [semanticDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.village_media_contents
      group by
        village_slug,
        category,
        provider,
        lower(btrim(title)),
        coalesce(published_at::date, created_at::date),
        md5(body::text),
        lower(regexp_replace(btrim(source_url), '/+$', ''))
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;

  metrics.villageMediaContents = numericRecord(mediaMetrics);
  addCheck(checks, {
    count: toNumber(legacyIdDuplicates.group_count),
    details: { excessRows: toNumber(legacyIdDuplicates.excess_rows) },
    id: "village_media_legacy_id_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(externalSourceDuplicates.group_count),
    details: { excessRows: toNumber(externalSourceDuplicates.excess_rows) },
    id: "village_media_external_source_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(semanticDuplicates.group_count),
    details: { excessRows: toNumber(semanticDuplicates.excess_rows) },
    id: "village_media_semantic_duplicates",
    severity: "warning",
  });

  diagnostics.villageMediaSemanticDuplicateGroups = (
    await tx`
      with duplicate_groups as (
        select
          category,
          provider,
          coalesce(published_at::date, created_at::date) as content_date,
          count(*)::bigint as row_count,
          count(legacy_id)::bigint as rows_with_legacy_id,
          count(distinct thumbnail_url)::bigint as thumbnail_variants,
          count(distinct md5(image_urls::text))::bigint as image_variants
        from public.village_media_contents
        group by
          village_slug,
          category,
          provider,
          lower(btrim(title)),
          coalesce(published_at::date, created_at::date),
          md5(body::text),
          lower(regexp_replace(btrim(source_url), '/+$', ''))
        having count(*) > 1
      )
      select
        row_number() over (order by content_date, provider, category)::integer
          as group_number,
        category,
        provider,
        content_date::text,
        row_count,
        rows_with_legacy_id,
        thumbnail_variants,
        image_variants
      from duplicate_groups
      order by group_number
    `
  ).map(numericRecordExceptArrays);
}

async function auditBoardPosts(tx, availableTables, checks) {
  if (!availableTables.has("village_page_sections")) return;

  const stateCte = `
    with board_states as (
      select
        id,
        village_slug,
        'draft'::text as state,
        case
          when jsonb_typeof(draft_content -> 'posts') = 'array'
            then draft_content -> 'posts'
          else '[]'::jsonb
        end as posts
      from public.village_page_sections
      where page_key = 'notice' and section_key = 'notice_index'
      union all
      select
        id,
        village_slug,
        'published'::text as state,
        case
          when jsonb_typeof(published_content -> 'posts') = 'array'
            then published_content -> 'posts'
          else '[]'::jsonb
        end as posts
      from public.village_page_sections
      where page_key = 'notice' and section_key = 'notice_index'
    ),
    expanded as (
      select id, village_slug, state, post
      from board_states
      cross join lateral jsonb_array_elements(posts) as post
    )
  `;
  const [sectionDuplicates] = await tx`
    with duplicate_groups as (
      select count(*)::bigint as row_count
      from public.village_page_sections
      group by village_slug, page_key, section_key
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `;
  const [idDuplicates] = await tx.unsafe(`
    ${stateCte}, duplicate_groups as (
      select count(*)::bigint as row_count
      from expanded
      where btrim(post ->> 'id') <> ''
      group by id, state, post ->> 'id'
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `);
  const [missingIds] = await tx.unsafe(`
    ${stateCte}
    select count(*)::bigint as count
    from expanded
    where nullif(btrim(post ->> 'id'), '') is null
  `);
  const [semanticDuplicates] = await tx.unsafe(`
    ${stateCte}, duplicate_groups as (
      select count(*)::bigint as row_count
      from expanded
      group by
        id,
        state,
        lower(btrim(post ->> 'title')),
        nullif(btrim(post ->> 'createdAt'), ''),
        md5(coalesce(post ->> 'body', ''))
      having count(*) > 1
    )
    select
      count(*)::bigint as group_count,
      coalesce(sum(row_count - 1), 0)::bigint as excess_rows
    from duplicate_groups
  `);

  addCheck(checks, {
    count: toNumber(sectionDuplicates.group_count),
    details: { excessRows: toNumber(sectionDuplicates.excess_rows) },
    id: "village_page_section_key_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(idDuplicates.group_count),
    details: { excessRows: toNumber(idDuplicates.excess_rows) },
    id: "channel_board_post_id_duplicates",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(missingIds.count),
    id: "channel_board_post_missing_ids",
    severity: "blocking",
  });
  addCheck(checks, {
    count: toNumber(semanticDuplicates.group_count),
    details: { excessRows: toNumber(semanticDuplicates.excess_rows) },
    id: "channel_board_post_semantic_duplicates",
    severity: "warning",
  });
}

async function auditProtectionState(tx, checks) {
  const [state] = await tx`
    select
      exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'program_applications'
          and indexname = 'program_applications_program_normalized_email_uidx'
          and indexdef ilike 'create unique index%'
      ) as application_unique_index,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.program_applications'::regclass
          and conname = 'program_applications_email_normalized_chk'
          and contype = 'c'
          and convalidated
      ) as application_email_normalized_check,
      coalesce((
        select attnotnull
        from pg_attribute
        where attrelid = 'public.program_applications'::regclass
          and attname = 'submitted_by'
          and not attisdropped
      ), false) as submitted_by_not_null,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.program_applications'::regclass
          and conname = 'program_applications_submitted_by_fkey'
          and contype = 'f'
          and confdeltype = 'r'
          and convalidated
      ) as submitted_by_restrict_fk,
      exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'reviews'
          and indexname = 'reviews_application_id_unique_idx'
          and indexdef ilike 'create unique index%'
      ) as review_unique_index,
      exists (
        select 1
        from pg_trigger
        where tgrelid = 'public.program_applications'::regclass
          and tgname = 'program_applications_prevent_program_run_mismatch'
          and not tgisinternal
      ) as application_run_guard,
      exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'host_village_memberships'
          and indexname = 'host_village_memberships_village_normalized_email_uidx'
          and indexdef ilike 'create unique index%'
      ) as membership_normalized_unique_index,
      exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'host_village_memberships'
          and indexname = 'host_village_memberships_village_active_user_uidx'
          and indexdef ilike 'create unique index%'
      ) as membership_active_user_unique_index,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.host_village_memberships'::regclass
          and conname = 'host_village_memberships_account_email_normalized_chk'
          and contype = 'c'
          and convalidated
      ) as membership_email_normalized_check,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.host_village_memberships'::regclass
          and conname = 'host_village_memberships_active_user_required_chk'
          and contype = 'c'
          and convalidated
      ) as membership_active_user_required_check,
      exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'village_media_contents'
          and indexname = 'village_media_contents_external_source_uidx'
          and indexdef ilike 'create unique index%'
      ) as media_source_unique_index,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.village_page_sections'::regclass
          and conname = 'village_page_sections_board_draft_post_ids_chk'
          and contype = 'c'
          and convalidated
      ) as board_draft_ids_check,
      exists (
        select 1
        from pg_constraint
        where conrelid = 'public.village_page_sections'::regclass
          and conname = 'village_page_sections_board_published_post_ids_chk'
          and contype = 'c'
          and convalidated
      ) as board_published_ids_check
  `;

  for (const [id, present] of [
    ["protection_application_normalized_email_unique", state.application_unique_index],
    ["protection_application_email_normalized_check", state.application_email_normalized_check],
    ["protection_application_submitted_by_not_null", state.submitted_by_not_null],
    ["protection_application_submitted_by_restrict_fk", state.submitted_by_restrict_fk],
    ["protection_review_application_unique", state.review_unique_index],
    ["protection_application_program_run_guard", state.application_run_guard],
    [
      "protection_membership_normalized_email_unique",
      state.membership_normalized_unique_index,
    ],
    [
      "protection_membership_active_user_unique",
      state.membership_active_user_unique_index,
    ],
    [
      "protection_membership_email_normalized_check",
      state.membership_email_normalized_check,
    ],
    [
      "protection_membership_active_user_required_check",
      state.membership_active_user_required_check,
    ],
    ["protection_media_external_source_unique", state.media_source_unique_index],
    ["protection_board_draft_post_ids_check", state.board_draft_ids_check],
    ["protection_board_published_post_ids_check", state.board_published_ids_check],
  ]) {
    addCheck(checks, {
      count: present ? 0 : 1,
      id,
      severity: "blocking",
    });
  }
}

async function auditForeignKeys(tx) {
  const constraints = await tx`
    select
      constraint_record.conname as constraint_name,
      child_namespace.nspname as child_schema,
      child_table.relname as child_table,
      parent_namespace.nspname as parent_schema,
      parent_table.relname as parent_table,
      array_agg(child_attribute.attname order by key_pair.ordinality) as child_columns,
      array_agg(parent_attribute.attname order by key_pair.ordinality) as parent_columns
    from pg_constraint constraint_record
    join pg_class child_table on child_table.oid = constraint_record.conrelid
    join pg_namespace child_namespace on child_namespace.oid = child_table.relnamespace
    join pg_class parent_table on parent_table.oid = constraint_record.confrelid
    join pg_namespace parent_namespace on parent_namespace.oid = parent_table.relnamespace
    join lateral unnest(constraint_record.conkey, constraint_record.confkey)
      with ordinality as key_pair(child_attnum, parent_attnum, ordinality) on true
    join pg_attribute child_attribute
      on child_attribute.attrelid = child_table.oid
      and child_attribute.attnum = key_pair.child_attnum
    join pg_attribute parent_attribute
      on parent_attribute.attrelid = parent_table.oid
      and parent_attribute.attnum = key_pair.parent_attnum
    where constraint_record.contype = 'f'
      and child_namespace.nspname = 'public'
    group by
      constraint_record.conname,
      child_namespace.nspname,
      child_table.relname,
      parent_namespace.nspname,
      parent_table.relname
    order by child_table.relname, constraint_record.conname
  `;

  const orphanConstraints = [];
  let orphanRowCount = 0;

  for (const constraint of constraints) {
    const childAlias = "child_row";
    const parentAlias = "parent_row";
    const join = constraint.child_columns
      .map(
        (column, index) =>
          `${childAlias}.${quoteIdentifier(column)} = ${parentAlias}.${quoteIdentifier(
            constraint.parent_columns[index],
          )}`,
      )
      .join(" and ");
    const childRequired = constraint.child_columns
      .map((column) => `${childAlias}.${quoteIdentifier(column)} is not null`)
      .join(" and ");
    const missingParent = `${parentAlias}.${quoteIdentifier(
      constraint.parent_columns[0],
    )} is null`;
    const [row] = await tx.unsafe(`
      select count(*)::bigint as count
      from ${quoteQualified(constraint.child_schema, constraint.child_table)} ${childAlias}
      left join ${quoteQualified(
        constraint.parent_schema,
        constraint.parent_table,
      )} ${parentAlias} on ${join}
      where ${childRequired} and ${missingParent}
    `);
    const count = toNumber(row.count);

    if (count > 0) {
      orphanRowCount += count;
      orphanConstraints.push({
        childTable: constraint.child_table,
        constraint: constraint.constraint_name,
        count,
        parentTable: constraint.parent_table,
      });
    }
  }

  return {
    checkedConstraintCount: constraints.length,
    orphanConstraints,
    orphanRowCount,
  };
}

function addCheck(checks, { count, details, id, severity }) {
  checks.push({
    count,
    ...(details ? { details } : {}),
    id,
    severity,
    status: count === 0 ? "pass" : severity === "info" ? "observed" : "finding",
  });
}

function hasAll(availableTables, tables) {
  return tables.every((table) => availableTables.has(table));
}

function numericRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, toNumber(value)]),
  );
}

function numericRecordExceptArrays(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (Array.isArray(value)) return [key, value];
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

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function quoteQualified(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
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
    "# NUVIO DB Integrity Audit",
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
    "Diagnostics contain counts and group ordinals only; no emails, user IDs, or row IDs are emitted.",
    "",
    "```json",
    JSON.stringify(report.diagnostics, null, 2),
    "```",
    "",
  );
  return `${lines.join("\n")}\n`;
}
