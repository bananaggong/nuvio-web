-- Keep magic-link review request tokens tied to active request states.
-- The application and normalization trigger already clear terminal tokens; this
-- constraint prevents future direct write paths from leaving usable tokens on
-- completed, cancelled, or expired requests.
update public.review_requests
set
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where status not in ('pending', 'sent', 'opened')
  and (request_token_hash is not null or request_token_expires_at is not null);

update public.review_requests
set
  request_token_expires_at = coalesce(expires_at, now() + interval '60 days'),
  updated_at = now()
where status in ('pending', 'sent', 'opened')
  and request_token_hash is not null
  and request_token_expires_at is null;

update public.review_requests
set
  request_token_expires_at = expires_at,
  updated_at = now()
where status in ('pending', 'sent', 'opened')
  and request_token_hash is not null
  and request_token_expires_at is not null
  and expires_at is not null
  and request_token_expires_at > expires_at;

update public.review_requests
set
  request_token_expires_at = null,
  updated_at = now()
where request_token_hash is null
  and request_token_expires_at is not null;

alter table public.review_requests
  drop constraint if exists review_requests_token_state_chk;

alter table public.review_requests
  add constraint review_requests_token_state_chk
  check (
    (
      request_token_hash is null
      and request_token_expires_at is null
    )
    or (
      status in ('pending', 'sent', 'opened')
      and request_token_hash is not null
      and request_token_expires_at is not null
    )
  );
