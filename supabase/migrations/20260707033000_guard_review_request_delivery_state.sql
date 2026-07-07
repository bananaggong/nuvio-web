-- Review request reminders are delivery attempts, not independent state. Keep
-- request_count, token state, and next_reminder_at aligned so reminder jobs and
-- host reporting cannot drift apart through direct writes.
update public.review_requests
set
  status = 'pending',
  request_count = 0,
  last_requested_at = null,
  next_reminder_at = null,
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where status = 'sent'
  and request_count = 0;

update public.review_requests
set
  status = 'pending',
  request_count = 0,
  last_requested_at = null,
  next_reminder_at = null,
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where status = 'sent'
  and request_count > 0
  and (request_token_hash is null or request_token_expires_at is null);

update public.review_requests
set
  last_requested_at = null,
  next_reminder_at = null,
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where request_count = 0
  and (
    last_requested_at is not null
    or next_reminder_at is not null
    or request_token_hash is not null
    or request_token_expires_at is not null
  );

update public.review_requests
set
  last_requested_at = coalesce(last_requested_at, updated_at, created_at, now()),
  updated_at = now()
where request_count > 0
  and last_requested_at is null;

update public.review_requests
set
  expires_at = coalesce(
    expires_at,
    request_token_expires_at,
    last_requested_at + interval '60 days',
    now() + interval '60 days'
  ),
  updated_at = now()
where status = 'sent'
  and expires_at is null;

update public.review_requests
set
  request_token_expires_at = expires_at,
  updated_at = now()
where status = 'sent'
  and request_token_hash is not null
  and request_token_expires_at is not null
  and expires_at is not null
  and request_token_expires_at > expires_at;

update public.review_requests
set
  next_reminder_at = null,
  updated_at = now()
where next_reminder_at is not null
  and (
    status not in ('sent', 'opened')
    or request_count = 0
    or request_count >= 4
    or last_requested_at is null
    or next_reminder_at <= last_requested_at
    or (expires_at is not null and next_reminder_at > expires_at)
  );

update public.review_requests
set
  opened_at = coalesce(opened_at, updated_at, created_at, now()),
  updated_at = now()
where status = 'opened'
  and opened_at is null;

alter table public.review_requests
  drop constraint if exists review_requests_delivery_attempt_state_chk;

alter table public.review_requests
  add constraint review_requests_delivery_attempt_state_chk
  check (
    (
      request_count = 0
      and last_requested_at is null
      and next_reminder_at is null
      and request_token_hash is null
      and request_token_expires_at is null
    )
    or (
      request_count between 1 and 4
      and last_requested_at is not null
    )
  );

alter table public.review_requests
  drop constraint if exists review_requests_sent_delivery_state_chk;

alter table public.review_requests
  add constraint review_requests_sent_delivery_state_chk
  check (
    status <> 'sent'
    or (
      request_count between 1 and 4
      and last_requested_at is not null
      and expires_at is not null
      and request_token_hash is not null
      and request_token_expires_at is not null
      and request_token_expires_at <= expires_at
    )
  );

alter table public.review_requests
  drop constraint if exists review_requests_opened_delivery_state_chk;

alter table public.review_requests
  add constraint review_requests_opened_delivery_state_chk
  check (
    status <> 'opened'
    or opened_at is not null
  );

alter table public.review_requests
  drop constraint if exists review_requests_reminder_window_chk;

alter table public.review_requests
  add constraint review_requests_reminder_window_chk
  check (
    next_reminder_at is null
    or (
      status in ('sent', 'opened')
      and request_count between 1 and 3
      and last_requested_at is not null
      and next_reminder_at > last_requested_at
      and (expires_at is null or next_reminder_at <= expires_at)
    )
  );

alter table public.review_requests
  drop constraint if exists review_requests_token_delivery_attempt_chk;

alter table public.review_requests
  add constraint review_requests_token_delivery_attempt_chk
  check (
    request_token_hash is null
    or (
      request_count > 0
      and last_requested_at is not null
    )
  );
