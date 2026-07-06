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
  );
