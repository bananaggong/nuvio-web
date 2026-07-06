update public.notification_events
set
  attempt_count = greatest(attempt_count, 0),
  max_attempts = least(greatest(max_attempts, 1), 20)
where attempt_count < 0
  or max_attempts < 1
  or max_attempts > 20;

update public.notification_events
set
  delivered_at = coalesce(delivered_at, updated_at, created_at, now()),
  next_attempt_at = null
where status in ('sent', 'skipped')
  and (
    delivered_at is null
    or next_attempt_at is not null
  );

update public.notification_events
set
  delivered_at = null,
  next_attempt_at = null
where status = 'failed'
  and (
    delivered_at is not null
    or next_attempt_at is not null
  );

update public.notification_events
set
  attempt_count = greatest(attempt_count, 1),
  delivered_at = null,
  last_attempt_at = coalesce(last_attempt_at, updated_at, created_at, now()),
  next_attempt_at = null
where status = 'processing'
  and (
    attempt_count <= 0
    or delivered_at is not null
    or last_attempt_at is null
    or next_attempt_at is not null
  );

update public.notification_events
set delivered_at = null
where status = 'pending'
  and delivered_at is not null;

update public.notification_events
set last_attempt_at = null
where status = 'pending'
  and attempt_count = 0
  and last_attempt_at is not null;

alter table public.notification_events
  drop constraint if exists notification_events_delivery_state_chk;

alter table public.notification_events
  add constraint notification_events_delivery_state_chk
  check (
    (
      status in ('sent', 'skipped')
      and delivered_at is not null
      and next_attempt_at is null
    )
    or (
      status = 'failed'
      and delivered_at is null
      and next_attempt_at is null
    )
    or (
      status = 'processing'
      and delivered_at is null
      and next_attempt_at is null
      and attempt_count > 0
      and last_attempt_at is not null
    )
    or (
      status = 'pending'
      and delivered_at is null
    )
  );

alter table public.notification_events
  drop constraint if exists notification_events_attempt_state_chk;

alter table public.notification_events
  add constraint notification_events_attempt_state_chk
  check (
    (
      attempt_count = 0
      and last_attempt_at is null
    )
    or attempt_count > 0
  );
