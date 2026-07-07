alter table public.review_report_events
  drop constraint if exists review_report_events_transition_action_chk;

alter table public.review_report_events
  add constraint review_report_events_transition_action_chk
  check (
    (
      from_status is null
      and action = 'created'
    )
    or (
      from_status is not null
      and from_status = to_status
      and action in ('updated', 'reason_changed')
    )
    or (
      from_status is distinct from to_status
      and to_status = 'reviewing'
      and action = 'marked_reviewing'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'resolved'
      and action = 'resolved'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'dismissed'
      and action = 'dismissed'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'open'
      and action = 'reopened'
    )
  );

alter table public.review_visibility_hold_events
  drop constraint if exists review_visibility_hold_events_transition_action_chk;

alter table public.review_visibility_hold_events
  add constraint review_visibility_hold_events_transition_action_chk
  check (
    (
      from_status is null
      and action = 'created'
    )
    or (
      from_status is not null
      and from_status = to_status
      and action in ('updated', 'metadata_changed')
    )
    or (
      from_status = 'released'
      and to_status = 'active'
      and action = 'reactivated'
    )
    or (
      from_status is distinct from to_status
      and coalesce(from_status, '') <> 'released'
      and to_status = 'active'
      and action = 'activated'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'released'
      and action = 'released'
    )
  );
