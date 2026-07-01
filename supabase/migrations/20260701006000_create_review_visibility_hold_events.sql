create table if not exists public.review_visibility_hold_events (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references public.review_visibility_holds(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id uuid,
  actor_role text,
  source_type text not null,
  source_id uuid,
  reason text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_visibility_hold_events_hold_id_idx
  on public.review_visibility_hold_events(hold_id);
create index if not exists review_visibility_hold_events_review_id_idx
  on public.review_visibility_hold_events(review_id);
create index if not exists review_visibility_hold_events_created_at_idx
  on public.review_visibility_hold_events(created_at desc);
create index if not exists review_visibility_hold_events_action_idx
  on public.review_visibility_hold_events(action);
create index if not exists review_visibility_hold_events_actor_id_idx
  on public.review_visibility_hold_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_status_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_status_chk
      check (
        (from_status is null or from_status in ('active', 'released'))
        and to_status in ('active', 'released')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_action_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_action_chk
      check (action in ('created', 'activated', 'released', 'reactivated', 'updated', 'metadata_changed', 'status_changed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_source_type_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_source_type_chk
      check (source_type in ('moderation_check', 'review_report', 'system'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_reason_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_reason_chk
      check (reason in ('high_risk_moderation', 'privacy_report', 'inappropriate_report', 'spam_report'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_note_length_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_note_length_chk
      check (note is null or char_length(btrim(note)) <= 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_hold_events_metadata_shape_chk'
      and conrelid = 'public.review_visibility_hold_events'::regclass
  ) then
    alter table public.review_visibility_hold_events
      add constraint review_visibility_hold_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_visibility_hold_event_action(
  previous_status text,
  next_status text,
  source_changed boolean,
  metadata_changed boolean
)
returns text
language sql
immutable
as $$
  select case
    when previous_status is null then 'created'
    when previous_status = 'released' and next_status = 'active' then 'reactivated'
    when previous_status is distinct from next_status and next_status = 'active' then 'activated'
    when previous_status is distinct from next_status and next_status = 'released' then 'released'
    when source_changed then 'updated'
    when metadata_changed then 'metadata_changed'
    when previous_status is distinct from next_status then 'status_changed'
    else 'metadata_changed'
  end;
$$;

revoke all on function public.review_visibility_hold_event_action(text, text, boolean, boolean) from public;
grant execute on function public.review_visibility_hold_event_action(text, text, boolean, boolean) to authenticated;

create or replace function public.record_review_visibility_hold_event_from_hold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_changed boolean := false;
  metadata_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    source_changed := old.review_id is distinct from new.review_id
      or old.source_type is distinct from new.source_type
      or old.source_id is distinct from new.source_id
      or old.reason is distinct from new.reason;
    metadata_changed := old.metadata is distinct from new.metadata;
    if old.status is not distinct from new.status
      and not source_changed
      and not metadata_changed
    then
      return new;
    end if;
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_visibility_hold_events (
    hold_id,
    review_id,
    from_status,
    to_status,
    action,
    actor_id,
    source_type,
    source_id,
    reason,
    metadata,
    created_at
  ) values (
    new.id,
    new.review_id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    public.review_visibility_hold_event_action(
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      source_changed,
      metadata_changed
    ),
    (select auth.uid()),
    new.source_type,
    new.source_id,
    new.reason,
    jsonb_build_object(
      'source', 'database_trigger',
      'holdId', new.id,
      'reviewId', new.review_id,
      'sourceType', new.source_type,
      'sourceId', new.source_id,
      'reason', new.reason,
      'status', new.status,
      'holdMetadata', coalesce(new.metadata, '{}'::jsonb)
    ),
    now()
  );

  return new;
end;
$$;

create or replace function public.prevent_review_visibility_hold_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review visibility hold events can only be created by hold write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review visibility hold events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review visibility hold events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null then
    raise exception 'Review visibility hold event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.hold_id is distinct from old.hold_id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
    or new.reason is distinct from old.reason
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review visibility hold event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all on function public.prevent_review_visibility_hold_event_mutation() from public;

drop trigger if exists review_visibility_holds_record_event on public.review_visibility_holds;
create trigger review_visibility_holds_record_event
after insert or update of review_id, source_type, source_id, reason, status, metadata
on public.review_visibility_holds
for each row
execute function public.record_review_visibility_hold_event_from_hold();


drop trigger if exists review_visibility_holds_prevent_hard_delete on public.review_visibility_holds;
create trigger review_visibility_holds_prevent_hard_delete
before delete
on public.review_visibility_holds
for each row
execute function public.prevent_review_hard_delete();

insert into public.review_visibility_hold_events (
  hold_id,
  review_id,
  from_status,
  to_status,
  action,
  source_type,
  source_id,
  reason,
  metadata,
  created_at
)
select
  hold.id,
  hold.review_id,
  null,
  hold.status,
  case when hold.status = 'released' then 'released' else 'created' end,
  hold.source_type,
  hold.source_id,
  hold.reason,
  jsonb_build_object(
    'source', 'migration_backfill',
    'holdId', hold.id,
    'reviewId', hold.review_id,
    'sourceType', hold.source_type,
    'sourceId', hold.source_id,
    'reason', hold.reason,
    'status', hold.status,
    'holdMetadata', coalesce(hold.metadata, '{}'::jsonb)
  ),
  coalesce(hold.held_at, hold.created_at, now())
from public.review_visibility_holds hold
where not exists (
  select 1
  from public.review_visibility_hold_events event
  where event.hold_id = hold.id
);

drop trigger if exists review_visibility_hold_events_prevent_mutation on public.review_visibility_hold_events;
create trigger review_visibility_hold_events_prevent_mutation
before insert or update or delete
on public.review_visibility_hold_events
for each row
execute function public.prevent_review_visibility_hold_event_mutation();
alter table public.review_visibility_hold_events enable row level security;

drop policy if exists "Host members can read review visibility hold events" on public.review_visibility_hold_events;
create policy "Host members can read review visibility hold events"
on public.review_visibility_hold_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_visibility_hold_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review visibility hold events" on public.review_visibility_hold_events;
create policy "Host members can manage review visibility hold events"
on public.review_visibility_hold_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_visibility_hold_events.review_id
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
    where review.id = public.review_visibility_hold_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_visibility_hold_events to authenticated;
revoke delete on table public.review_visibility_holds from authenticated;