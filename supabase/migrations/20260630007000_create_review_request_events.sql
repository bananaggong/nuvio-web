create table if not exists public.review_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.review_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_request_events_request_id_idx
  on public.review_request_events(request_id);
create index if not exists review_request_events_created_at_idx
  on public.review_request_events(created_at desc);
create index if not exists review_request_events_action_idx
  on public.review_request_events(action);
create index if not exists review_request_events_actor_id_idx
  on public.review_request_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_request_events_status_chk'
      and conrelid = 'public.review_request_events'::regclass
  ) then
    alter table public.review_request_events
      add constraint review_request_events_status_chk
      check (
        (from_status is null or from_status in ('pending', 'sent', 'opened', 'completed', 'cancelled', 'expired'))
        and to_status in ('pending', 'sent', 'opened', 'completed', 'cancelled', 'expired')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_request_events_action_chk'
      and conrelid = 'public.review_request_events'::regclass
  ) then
    alter table public.review_request_events
      add constraint review_request_events_action_chk
      check (action in ('created', 'requested', 'resent', 'sent', 'opened', 'completed', 'cancelled', 'expired', 'reopened', 'status_changed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_request_events_note_length_chk'
      and conrelid = 'public.review_request_events'::regclass
  ) then
    alter table public.review_request_events
      add constraint review_request_events_note_length_chk
      check (note is null or char_length(btrim(note)) <= 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_request_events_metadata_shape_chk'
      and conrelid = 'public.review_request_events'::regclass
  ) then
    alter table public.review_request_events
      add constraint review_request_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_request_event_action(from_status text, to_status text)
returns text
language sql
immutable
as $$
  select case
    when from_status is null then 'created'
    when from_status = 'completed' and to_status <> 'completed' then 'reopened'
    when to_status = 'sent' then 'sent'
    when to_status = 'opened' then 'opened'
    when to_status = 'completed' then 'completed'
    when to_status = 'cancelled' then 'cancelled'
    when to_status = 'expired' then 'expired'
    when to_status = 'pending' and from_status in ('cancelled', 'expired') then 'reopened'
    else 'status_changed'
  end;
$$;

revoke all on function public.review_request_event_action(text, text) from public;
grant execute on function public.review_request_event_action(text, text) to authenticated;

create or replace function public.record_review_request_event_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.review_request_events (
    request_id,
    from_status,
    to_status,
    action,
    actor_id,
    metadata,
    created_at
  ) values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    public.review_request_event_action(case when tg_op = 'INSERT' then null else old.status end, new.status),
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'applicationId', new.application_id,
      'programId', new.program_id,
      'requestCount', new.request_count
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists review_requests_record_event_after_write on public.review_requests;
create trigger review_requests_record_event_after_write
after insert or update of status
on public.review_requests
for each row
execute function public.record_review_request_event_from_request();

insert into public.review_request_events (
  request_id,
  from_status,
  to_status,
  action,
  metadata,
  created_at
)
select
  request.id,
  null,
  request.status,
  public.review_request_event_action(null, request.status),
  jsonb_build_object(
    'source', 'migration_backfill',
    'applicationId', request.application_id,
    'programId', request.program_id,
    'requestCount', request.request_count
  ),
  coalesce(request.last_requested_at, request.completed_at, request.cancelled_at, request.created_at, now())
from public.review_requests request
where not exists (
  select 1
  from public.review_request_events event
  where event.request_id = request.id
);

alter table public.review_request_events enable row level security;

drop policy if exists "Users can read own review request events" on public.review_request_events;
create policy "Users can read own review request events"
on public.review_request_events for select
to authenticated
using (
  exists (
    select 1
    from public.review_requests request
    where request.id = public.review_request_events.request_id
      and public.current_user_owns_application(request.application_id)
  )
);

drop policy if exists "Host members can read review request events" on public.review_request_events;
create policy "Host members can read review request events"
on public.review_request_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.review_requests request
    where request.id = public.review_request_events.request_id
      and (
        (request.village_slug is not null and public.current_user_can_edit_village_slug(request.village_slug))
        or (request.program_id is not null and public.current_user_can_edit_program(request.program_id))
      )
  )
);

drop policy if exists "Host members can manage review request events" on public.review_request_events;
create policy "Host members can manage review request events"
on public.review_request_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.review_requests request
    where request.id = public.review_request_events.request_id
      and (
        (request.village_slug is not null and public.current_user_can_edit_village_slug(request.village_slug))
        or (request.program_id is not null and public.current_user_can_edit_program(request.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.review_requests request
    where request.id = public.review_request_events.request_id
      and (
        (request.village_slug is not null and public.current_user_can_edit_village_slug(request.village_slug))
        or (request.program_id is not null and public.current_user_can_edit_program(request.program_id))
      )
  )
);

grant select, insert, update on table public.review_request_events to authenticated;