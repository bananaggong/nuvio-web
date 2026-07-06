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
    when previous_status is not distinct from next_status then 'updated'
    when next_status::text = 'deleted' then 'deleted'
    when previous_status = 'hidden' and next_status <> 'hidden' then 'restored'
    when next_status = 'published' then 'published'
    when next_status = 'hidden' then 'hidden'
    when next_status = 'pending' then 'moved_to_pending'
    when next_status = 'draft' then 'moved_to_draft'
    else 'status_changed'
  end;
$$;

revoke all privileges on function public.review_status_event_action(
  public.review_status,
  public.review_status
) from anon, authenticated, public;

alter table public.review_status_events
  drop constraint if exists review_status_events_transition_action_chk;

alter table public.review_status_events
  add constraint review_status_events_transition_action_chk
  check (
    (
      action in ('updated', 'moderation_checked')
      and from_status is not null
      and from_status is not distinct from to_status
    )
    or (
      action not in ('updated', 'moderation_checked')
      and action = public.review_status_event_action(from_status, to_status)
    )
  )
  not valid;
