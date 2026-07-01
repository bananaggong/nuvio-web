create table if not exists public.review_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.review_reports(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id uuid,
  actor_role text,
  reason text not null,
  message text,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_report_events_report_id_idx
  on public.review_report_events(report_id);
create index if not exists review_report_events_review_id_idx
  on public.review_report_events(review_id);
create index if not exists review_report_events_created_at_idx
  on public.review_report_events(created_at desc);
create index if not exists review_report_events_action_idx
  on public.review_report_events(action);
create index if not exists review_report_events_actor_id_idx
  on public.review_report_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_report_events_status_chk'
      and conrelid = 'public.review_report_events'::regclass
  ) then
    alter table public.review_report_events
      add constraint review_report_events_status_chk
      check (
        (from_status is null or from_status in ('open', 'reviewing', 'resolved', 'dismissed'))
        and to_status in ('open', 'reviewing', 'resolved', 'dismissed')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_report_events_action_chk'
      and conrelid = 'public.review_report_events'::regclass
  ) then
    alter table public.review_report_events
      add constraint review_report_events_action_chk
      check (action in ('created', 'updated', 'marked_reviewing', 'resolved', 'dismissed', 'reopened', 'reason_changed', 'status_changed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_report_events_reason_chk'
      and conrelid = 'public.review_report_events'::regclass
  ) then
    alter table public.review_report_events
      add constraint review_report_events_reason_chk
      check (reason in ('inappropriate', 'privacy', 'spam', 'false_information', 'other'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_report_events_metadata_shape_chk'
      and conrelid = 'public.review_report_events'::regclass
  ) then
    alter table public.review_report_events
      add constraint review_report_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_report_event_action(
  previous_status text,
  next_status text,
  reason_changed boolean
)
returns text
language sql
immutable
as $$
  select case
    when previous_status is null then 'created'
    when previous_status is distinct from next_status and next_status = 'reviewing' then 'marked_reviewing'
    when previous_status is distinct from next_status and next_status = 'resolved' then 'resolved'
    when previous_status is distinct from next_status and next_status = 'dismissed' then 'dismissed'
    when previous_status is distinct from next_status and next_status = 'open' then 'reopened'
    when reason_changed then 'reason_changed'
    when previous_status is distinct from next_status then 'status_changed'
    else 'updated'
  end;
$$;

revoke all on function public.review_report_event_action(text, text, boolean) from public;
grant execute on function public.review_report_event_action(text, text, boolean) to authenticated;

create or replace function public.record_review_report_event_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reason_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    reason_changed := old.reason is distinct from new.reason;
    if old.status is not distinct from new.status
      and not reason_changed
      and old.message is not distinct from new.message
      and old.resolution_note is not distinct from new.resolution_note
    then
      return new;
    end if;
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_report_events (
    report_id,
    review_id,
    from_status,
    to_status,
    action,
    actor_id,
    reason,
    message,
    resolution_note,
    metadata,
    created_at
  ) values (
    new.id,
    new.review_id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    public.review_report_event_action(case when tg_op = 'INSERT' then null else old.status end, new.status, reason_changed),
    (select auth.uid()),
    new.reason,
    new.message,
    new.resolution_note,
    jsonb_build_object(
      'source', 'database_trigger',
      'reportId', new.id,
      'reviewId', new.review_id,
      'reason', new.reason,
      'status', new.status
    ),
    now()
  );

  return new;
end;
$$;

insert into public.review_report_events (
  report_id,
  review_id,
  from_status,
  to_status,
  action,
  actor_id,
  reason,
  message,
  resolution_note,
  metadata,
  created_at
)
select
  report.id,
  report.review_id,
  null,
  report.status,
  'created',
  report.reporter_id,
  report.reason,
  report.message,
  report.resolution_note,
  jsonb_build_object(
    'source', 'migration_backfill',
    'reportId', report.id,
    'reviewId', report.review_id,
    'status', report.status
  ),
  coalesce(report.created_at, now())
from public.review_reports report
where not exists (
  select 1
  from public.review_report_events event
  where event.report_id = report.id
);

create or replace function public.prevent_review_report_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review report events can only be created by report write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review report events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review report events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null then
    raise exception 'Review report event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.report_id is distinct from old.report_id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.reason is distinct from old.reason
    or new.message is distinct from old.message
    or new.resolution_note is distinct from old.resolution_note
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review report event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all on function public.prevent_review_report_event_mutation() from public;

drop trigger if exists review_report_events_prevent_mutation on public.review_report_events;
create trigger review_report_events_prevent_mutation
before insert or update or delete
on public.review_report_events
for each row
execute function public.prevent_review_report_event_mutation();

drop trigger if exists review_reports_record_event on public.review_reports;
create trigger review_reports_record_event
after insert or update of status, reason, message, resolution_note
on public.review_reports
for each row
execute function public.record_review_report_event_from_report();

drop trigger if exists review_reports_prevent_hard_delete on public.review_reports;
create trigger review_reports_prevent_hard_delete
before delete
on public.review_reports
for each row
execute function public.prevent_review_hard_delete();

alter table public.review_report_events enable row level security;

drop policy if exists "Host members can read review report events" on public.review_report_events;
create policy "Host members can read review report events"
on public.review_report_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_report_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review report events" on public.review_report_events;
create policy "Host members can manage review report events"
on public.review_report_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_report_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_report_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_report_events to authenticated;
revoke delete on table public.review_reports from authenticated;