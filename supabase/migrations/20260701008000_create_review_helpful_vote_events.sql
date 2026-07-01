create table if not exists public.review_helpful_vote_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_helpful_vote_events_review_id_idx
  on public.review_helpful_vote_events(review_id);
create index if not exists review_helpful_vote_events_user_id_idx
  on public.review_helpful_vote_events(user_id);
create index if not exists review_helpful_vote_events_created_at_idx
  on public.review_helpful_vote_events(created_at desc);
create index if not exists review_helpful_vote_events_action_idx
  on public.review_helpful_vote_events(action);
create index if not exists review_helpful_vote_events_actor_id_idx
  on public.review_helpful_vote_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_helpful_vote_events_action_chk'
      and conrelid = 'public.review_helpful_vote_events'::regclass
  ) then
    alter table public.review_helpful_vote_events
      add constraint review_helpful_vote_events_action_chk
      check (action in ('added', 'removed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_helpful_vote_events_metadata_shape_chk'
      and conrelid = 'public.review_helpful_vote_events'::regclass
  ) then
    alter table public.review_helpful_vote_events
      add constraint review_helpful_vote_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.record_review_helpful_vote_event_from_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_review_id uuid;
  target_user_id uuid;
  target_action text;
begin
  if tg_op = 'DELETE' then
    target_review_id := old.review_id;
    target_user_id := old.user_id;
    target_action := 'removed';
  else
    target_review_id := new.review_id;
    target_user_id := new.user_id;
    target_action := 'added';
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_helpful_vote_events (
    review_id,
    user_id,
    action,
    actor_id,
    metadata,
    created_at
  ) values (
    target_review_id,
    target_user_id,
    target_action,
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'reviewId', target_review_id,
      'userId', target_user_id,
      'action', target_action
    ),
    now()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.record_review_helpful_vote_event_from_vote() from public;

create or replace function public.prevent_review_helpful_vote_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review helpful vote events can only be created by vote write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review helpful vote events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review helpful vote events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null then
    raise exception 'Review helpful vote event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.user_id is distinct from old.user_id
    or new.action is distinct from old.action
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review helpful vote event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all on function public.prevent_review_helpful_vote_event_mutation() from public;

drop trigger if exists review_helpful_votes_record_event on public.review_helpful_votes;
create trigger review_helpful_votes_record_event
after insert or delete
on public.review_helpful_votes
for each row
execute function public.record_review_helpful_vote_event_from_vote();

insert into public.review_helpful_vote_events (
  review_id,
  user_id,
  action,
  metadata,
  created_at
)
select
  vote.review_id,
  vote.user_id,
  'added',
  jsonb_build_object(
    'source', 'migration_backfill',
    'reviewId', vote.review_id,
    'userId', vote.user_id,
    'action', 'added'
  ),
  coalesce(vote.created_at, now())
from public.review_helpful_votes vote
where not exists (
  select 1
  from public.review_helpful_vote_events event
  where event.review_id = vote.review_id
    and event.user_id = vote.user_id
    and event.action = 'added'
    and event.metadata ->> 'source' = 'migration_backfill'
);

drop trigger if exists review_helpful_vote_events_prevent_mutation on public.review_helpful_vote_events;
create trigger review_helpful_vote_events_prevent_mutation
before insert or update or delete
on public.review_helpful_vote_events
for each row
execute function public.prevent_review_helpful_vote_event_mutation();

alter table public.review_helpful_vote_events enable row level security;

drop policy if exists "Users can read own review helpful vote events" on public.review_helpful_vote_events;
create policy "Users can read own review helpful vote events"
on public.review_helpful_vote_events for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Host members can read review helpful vote events" on public.review_helpful_vote_events;
create policy "Host members can read review helpful vote events"
on public.review_helpful_vote_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_helpful_vote_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review helpful vote events" on public.review_helpful_vote_events;
create policy "Host members can manage review helpful vote events"
on public.review_helpful_vote_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_helpful_vote_events.review_id
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
    where review.id = public.review_helpful_vote_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_helpful_vote_events to authenticated;
