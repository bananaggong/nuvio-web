-- This migration intentionally contains no cleanup DML. It must fail before
-- any DDL when legacy data violates a proposed invariant. Resolve every
-- preflight finding with the reviewed cleanup runbook, rerun the read-only
-- audit, and only then apply this migration in a separate maintenance change.

do $preflight$
declare
  application_duplicate_groups bigint;
  application_missing_submitters bigint;
  application_non_normalized_emails bigint;
  active_review_duplicate_groups bigint;
  application_run_mismatches bigint;
  review_run_mismatches bigint;
  review_request_run_mismatches bigint;
  membership_email_duplicate_groups bigint;
  membership_active_user_duplicate_groups bigint;
  membership_active_missing_users bigint;
  membership_non_normalized_emails bigint;
  media_source_duplicate_groups bigint;
  media_legacy_id_duplicate_groups bigint;
  page_section_duplicate_groups bigint;
  board_invalid_post_ids bigint;
  unvalidated_public_foreign_keys bigint;
begin
  select count(*)
  into application_duplicate_groups
  from (
    select 1
    from public.program_applications
    group by program_id, lower(btrim(email))
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into application_missing_submitters
  from public.program_applications
  where submitted_by is null;

  select count(*)
  into application_non_normalized_emails
  from public.program_applications
  where email is distinct from lower(btrim(email));

  select count(*)
  into active_review_duplicate_groups
  from (
    select 1
    from public.reviews
    where application_id is not null
      and status::text <> 'deleted'
    group by application_id
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into application_run_mismatches
  from public.program_applications application
  inner join public.program_runs run on run.id = application.program_run_id
  where application.program_run_id is not null
    and application.program_id <> run.program_id;

  select count(*)
  into review_run_mismatches
  from public.reviews review
  inner join public.program_runs run on run.id = review.program_run_id
  where review.program_run_id is not null
    and (review.program_id is null or review.program_id <> run.program_id);

  select count(*)
  into review_request_run_mismatches
  from public.review_requests request
  inner join public.program_runs run on run.id = request.program_run_id
  where request.program_run_id is not null
    and (request.program_id is null or request.program_id <> run.program_id);

  select count(*)
  into membership_email_duplicate_groups
  from (
    select 1
    from public.host_village_memberships
    group by village_id, lower(btrim(account_email))
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into membership_active_user_duplicate_groups
  from (
    select 1
    from public.host_village_memberships
    where status::text = 'active' and user_id is not null
    group by village_id, user_id
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into membership_active_missing_users
  from public.host_village_memberships
  where status::text = 'active' and user_id is null;

  select count(*)
  into membership_non_normalized_emails
  from public.host_village_memberships
  where account_email is distinct from lower(btrim(account_email));

  select count(*)
  into media_source_duplicate_groups
  from (
    select 1
    from public.village_media_contents
    where provider in ('instagram', 'youtube', 'naver', 'video')
      and btrim(source_url) <> ''
    group by
      village_slug,
      provider,
      lower(rtrim(btrim(source_url), '/'))
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into media_legacy_id_duplicate_groups
  from (
    select 1
    from public.village_media_contents
    where legacy_id is not null
    group by legacy_id
    having count(*) > 1
  ) duplicate_groups;

  select count(*)
  into page_section_duplicate_groups
  from (
    select 1
    from public.village_page_sections
    group by village_slug, page_key, section_key
    having count(*) > 1
  ) duplicate_groups;

  with board_states as (
    select
      id,
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
      'published'::text as state,
      case
        when jsonb_typeof(published_content -> 'posts') = 'array'
          then published_content -> 'posts'
        else '[]'::jsonb
      end as posts
    from public.village_page_sections
    where page_key = 'notice' and section_key = 'notice_index'
  ), expanded as (
    select id, state, post
    from board_states
    cross join lateral jsonb_array_elements(posts) as post
  ), invalid_rows as (
    select 1
    from expanded
    where jsonb_typeof(post) <> 'object'
      or nullif(btrim(post ->> 'id'), '') is null
    union all
    select 1
    from expanded
    where nullif(btrim(post ->> 'id'), '') is not null
    group by id, state, post ->> 'id'
    having count(*) > 1
  )
  select count(*) into board_invalid_post_ids from invalid_rows;

  select count(*)
  into unvalidated_public_foreign_keys
  from pg_constraint constraint_record
  inner join pg_class child_table on child_table.oid = constraint_record.conrelid
  inner join pg_namespace child_namespace on child_namespace.oid = child_table.relnamespace
  where constraint_record.contype = 'f'
    and child_namespace.nspname = 'public'
    and not constraint_record.convalidated;

  if application_duplicate_groups > 0
    or application_missing_submitters > 0
    or application_non_normalized_emails > 0
    or active_review_duplicate_groups > 0
    or application_run_mismatches > 0
    or review_run_mismatches > 0
    or review_request_run_mismatches > 0
    or membership_email_duplicate_groups > 0
    or membership_active_user_duplicate_groups > 0
    or membership_active_missing_users > 0
    or membership_non_normalized_emails > 0
    or media_source_duplicate_groups > 0
    or media_legacy_id_duplicate_groups > 0
    or page_section_duplicate_groups > 0
    or board_invalid_post_ids > 0
    or unvalidated_public_foreign_keys > 0
  then
    raise exception using
      errcode = '23514',
      message = format(
        'NUVIO integrity preflight failed: app_duplicate_groups=%s, app_missing_submitters=%s, app_non_normalized_emails=%s, active_review_duplicate_groups=%s, app_run_mismatches=%s, review_run_mismatches=%s, review_request_run_mismatches=%s, membership_email_duplicate_groups=%s, membership_active_user_duplicate_groups=%s, membership_active_missing_users=%s, membership_non_normalized_emails=%s, media_source_duplicate_groups=%s, media_legacy_id_duplicate_groups=%s, page_section_duplicate_groups=%s, board_invalid_post_ids=%s, unvalidated_public_foreign_keys=%s',
        application_duplicate_groups,
        application_missing_submitters,
        application_non_normalized_emails,
        active_review_duplicate_groups,
        application_run_mismatches,
        review_run_mismatches,
        review_request_run_mismatches,
        membership_email_duplicate_groups,
        membership_active_user_duplicate_groups,
        membership_active_missing_users,
        membership_non_normalized_emails,
        media_source_duplicate_groups,
        media_legacy_id_duplicate_groups,
        page_section_duplicate_groups,
        board_invalid_post_ids,
        unvalidated_public_foreign_keys
      ),
      hint = 'Run npm run audit:db-integrity and follow docs/db-integrity-cleanup-runbook.md. This migration never deletes or merges rows.';
  end if;
end
$preflight$;

drop index if exists public.program_applications_program_lower_email_idx;
create unique index program_applications_program_normalized_email_uidx
  on public.program_applications (program_id, lower(btrim(email)));

alter table public.program_applications
  drop constraint if exists program_applications_email_normalized_chk,
  add constraint program_applications_email_normalized_chk
    check (email = lower(btrim(email))) not valid;
alter table public.program_applications
  validate constraint program_applications_email_normalized_chk;

alter table public.program_applications
  drop constraint if exists program_applications_submitted_by_fkey;
alter table public.program_applications
  alter column submitted_by set not null,
  add constraint program_applications_submitted_by_fkey
    foreign key (submitted_by) references public.profiles(id) on delete restrict;

drop index if exists public.host_village_memberships_village_account_email_idx;
create unique index host_village_memberships_village_normalized_email_uidx
  on public.host_village_memberships (village_id, lower(btrim(account_email)));
create unique index host_village_memberships_village_active_user_uidx
  on public.host_village_memberships (village_id, user_id)
  where status = 'active' and user_id is not null;

alter table public.host_village_memberships
  drop constraint if exists host_village_memberships_account_email_normalized_chk,
  add constraint host_village_memberships_account_email_normalized_chk
    check (account_email = lower(btrim(account_email))) not valid,
  drop constraint if exists host_village_memberships_active_user_required_chk,
  add constraint host_village_memberships_active_user_required_chk
    check (status <> 'active' or user_id is not null) not valid;
alter table public.host_village_memberships
  validate constraint host_village_memberships_account_email_normalized_chk;
alter table public.host_village_memberships
  validate constraint host_village_memberships_active_user_required_chk;

create unique index village_media_contents_external_source_uidx
  on public.village_media_contents (
    village_slug,
    provider,
    lower(rtrim(btrim(source_url), '/'))
  )
  where provider in ('instagram', 'youtube', 'naver', 'video')
    and btrim(source_url) <> '';

create or replace function public.jsonb_array_has_unique_nonempty_ids(value jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = pg_catalog
as $function$
  select case
    when value is null then true
    when jsonb_typeof(value) <> 'array' then false
    else
      not exists (
        select 1
        from jsonb_array_elements(value) item
        where jsonb_typeof(item) <> 'object'
          or nullif(btrim(item ->> 'id'), '') is null
      )
      and (
        select count(*) = count(distinct item ->> 'id')
        from jsonb_array_elements(value) item
      )
  end;
$function$;

revoke all privileges on function public.jsonb_array_has_unique_nonempty_ids(jsonb)
from anon, authenticated, public;

alter table public.village_page_sections
  drop constraint if exists village_page_sections_board_draft_post_ids_chk,
  add constraint village_page_sections_board_draft_post_ids_chk
    check (
      page_key <> 'notice'
      or section_key <> 'notice_index'
      or public.jsonb_array_has_unique_nonempty_ids(draft_content -> 'posts')
    ) not valid,
  drop constraint if exists village_page_sections_board_published_post_ids_chk,
  add constraint village_page_sections_board_published_post_ids_chk
    check (
      page_key <> 'notice'
      or section_key <> 'notice_index'
      or public.jsonb_array_has_unique_nonempty_ids(published_content -> 'posts')
    ) not valid;

alter table public.village_page_sections
  validate constraint village_page_sections_board_draft_post_ids_chk;
alter table public.village_page_sections
  validate constraint village_page_sections_board_published_post_ids_chk;
