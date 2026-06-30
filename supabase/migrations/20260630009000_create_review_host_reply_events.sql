create table if not exists public.review_host_reply_events (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null references public.review_host_replies(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  author_name text not null,
  body text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_host_reply_events_reply_id_idx
  on public.review_host_reply_events(reply_id);
create index if not exists review_host_reply_events_review_id_idx
  on public.review_host_reply_events(review_id);
create index if not exists review_host_reply_events_created_at_idx
  on public.review_host_reply_events(created_at desc);
create index if not exists review_host_reply_events_action_idx
  on public.review_host_reply_events(action);
create index if not exists review_host_reply_events_actor_id_idx
  on public.review_host_reply_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_status_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_status_chk
      check (
        (from_status is null or from_status in ('published', 'hidden'))
        and to_status in ('published', 'hidden')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_action_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_action_chk
      check (action in ('created', 'updated', 'published', 'hidden', 'status_changed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_body_length_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_body_length_chk
      check (char_length(btrim(body)) between 2 and 2000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_author_name_length_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_author_name_length_chk
      check (char_length(btrim(author_name)) between 1 and 120);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_note_length_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_note_length_chk
      check (note is null or char_length(btrim(note)) <= 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_reply_events_metadata_shape_chk'
      and conrelid = 'public.review_host_reply_events'::regclass
  ) then
    alter table public.review_host_reply_events
      add constraint review_host_reply_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_host_reply_event_action(from_status text, to_status text, body_changed boolean, author_changed boolean)
returns text
language sql
immutable
as $$
  select case
    when from_status is null then 'created'
    when from_status is distinct from to_status and to_status = 'hidden' then 'hidden'
    when from_status is distinct from to_status and to_status = 'published' then 'published'
    when from_status is distinct from to_status then 'status_changed'
    when body_changed or author_changed then 'updated'
    else 'status_changed'
  end;
$$;

revoke all on function public.review_host_reply_event_action(text, text, boolean, boolean) from public;
grant execute on function public.review_host_reply_event_action(text, text, boolean, boolean) to authenticated;

create or replace function public.record_review_host_reply_event_from_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  body_changed boolean := false;
  author_changed boolean := false;
  previous_status text;
begin
  if tg_op = 'UPDATE' then
    body_changed := old.body is distinct from new.body;
    author_changed := old.author_name is distinct from new.author_name;
    if old.status is not distinct from new.status
      and not body_changed
      and not author_changed
    then
      return new;
    end if;
    previous_status := old.status;
  else
    previous_status := null;
  end if;

  insert into public.review_host_reply_events (
    reply_id,
    review_id,
    from_status,
    to_status,
    action,
    actor_id,
    author_name,
    body,
    metadata,
    created_at
  ) values (
    new.id,
    new.review_id,
    previous_status,
    new.status,
    public.review_host_reply_event_action(previous_status, new.status, body_changed, author_changed),
    (select auth.uid()),
    new.author_name,
    new.body,
    jsonb_build_object(
      'source', 'database_trigger',
      'bodyChanged', body_changed,
      'authorChanged', author_changed
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists review_host_replies_record_event_after_write on public.review_host_replies;
create trigger review_host_replies_record_event_after_write
after insert or update of author_name, body, status
on public.review_host_replies
for each row
execute function public.record_review_host_reply_event_from_reply();

insert into public.review_host_reply_events (
  reply_id,
  review_id,
  from_status,
  to_status,
  action,
  author_name,
  body,
  metadata,
  created_at
)
select
  reply.id,
  reply.review_id,
  null,
  reply.status,
  'created',
  reply.author_name,
  reply.body,
  jsonb_build_object('source', 'migration_backfill'),
  coalesce(reply.created_at, now())
from public.review_host_replies reply
where not exists (
  select 1
  from public.review_host_reply_events event
  where event.reply_id = reply.id
);

alter table public.review_host_reply_events enable row level security;

drop policy if exists "Host members can read review host reply events" on public.review_host_reply_events;
create policy "Host members can read review host reply events"
on public.review_host_reply_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_host_reply_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review host reply events" on public.review_host_reply_events;
create policy "Host members can manage review host reply events"
on public.review_host_reply_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_host_reply_events.review_id
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
    where review.id = public.review_host_reply_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_host_reply_events to authenticated;