create table if not exists public.review_status_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  from_status public.review_status,
  to_status public.review_status not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  note text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_status_events_review_id_idx
  on public.review_status_events(review_id);
create index if not exists review_status_events_created_at_idx
  on public.review_status_events(created_at desc);
create index if not exists review_status_events_action_idx
  on public.review_status_events(action);
create index if not exists review_status_events_actor_id_idx
  on public.review_status_events(actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_status_events_action_chk'
      and conrelid = 'public.review_status_events'::regclass
  ) then
    alter table public.review_status_events
      add constraint review_status_events_action_chk
      check (
        action in (
          'created',
          'updated',
          'published',
          'hidden',
          'restored',
          'moved_to_pending',
          'moved_to_draft',
          'status_changed',
          'moderation_checked',
          'deleted'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_status_events_metadata_shape_chk'
      and conrelid = 'public.review_status_events'::regclass
  ) then
    alter table public.review_status_events
      add constraint review_status_events_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_status_event_action(
  previous_status public.review_status,
  next_status public.review_status
)
returns text
language sql
immutable
as $$
  select case
    when previous_status is null then 'created'
    when previous_status = 'hidden' and next_status <> 'hidden' then 'restored'
    when next_status = 'published' then 'published'
    when next_status = 'hidden' then 'hidden'
    when next_status = 'pending' then 'moved_to_pending'
    when next_status = 'draft' then 'moved_to_draft'
    else 'status_changed'
  end;
$$;

revoke all on function public.review_status_event_action(public.review_status, public.review_status) from public;
grant execute on function public.review_status_event_action(public.review_status, public.review_status) to authenticated;

create or replace function public.record_review_status_event_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.review_status_events (
      review_id,
      from_status,
      to_status,
      action,
      actor_id,
      reason,
      note,
      metadata
    ) values (
      new.id,
      null,
      new.status,
      public.review_status_event_action(null, new.status),
      (select auth.uid()),
      coalesce(new.hidden_reason, new.moderation_note),
      new.moderation_note,
      jsonb_build_object(
        'source', 'database_trigger',
        'reviewSource', new.source,
        'applicationId', new.application_id,
        'programId', new.program_id
      )
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.review_status_events (
      review_id,
      from_status,
      to_status,
      action,
      actor_id,
      reason,
      note,
      metadata
    ) values (
      new.id,
      old.status,
      new.status,
      public.review_status_event_action(old.status, new.status),
      (select auth.uid()),
      coalesce(new.hidden_reason, new.moderation_note),
      new.moderation_note,
      jsonb_build_object(
        'source', 'database_trigger',
        'reviewSource', new.source,
        'applicationId', new.application_id,
        'programId', new.program_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_record_status_event_after_write on public.reviews;
create trigger reviews_record_status_event_after_write
after insert or update of status
on public.reviews
for each row
execute function public.record_review_status_event_from_review();

insert into public.review_status_events (
  review_id,
  from_status,
  to_status,
  action,
  reason,
  note,
  metadata,
  created_at
)
select
  review.id,
  null,
  review.status,
  'created',
  coalesce(review.hidden_reason, review.moderation_note),
  review.moderation_note,
  jsonb_build_object(
    'source', 'migration_backfill',
    'reviewSource', review.source,
    'applicationId', review.application_id,
    'programId', review.program_id
  ),
  coalesce(review.submitted_at, review.created_at, now())
from public.reviews review
where not exists (
  select 1
  from public.review_status_events event
  where event.review_id = review.id
    and event.action = 'created'
);

alter table public.review_status_events enable row level security;

drop policy if exists "Host members can read review status events" on public.review_status_events;
create policy "Host members can read review status events"
on public.review_status_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_status_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review status events" on public.review_status_events;
create policy "Host members can manage review status events"
on public.review_status_events for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_status_events.review_id
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
    where review.id = public.review_status_events.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_status_events to authenticated;