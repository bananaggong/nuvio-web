update public.review_requests
set
  request_count = 4,
  next_reminder_at = null,
  updated_at = now()
where request_count > 4;

update public.review_requests
set
  next_reminder_at = null,
  updated_at = now()
where status in ('pending', 'sent', 'opened')
  and request_count >= 4
  and next_reminder_at is not null;

alter table public.review_requests
  drop constraint if exists review_requests_request_count_chk;

alter table public.review_requests
  add constraint review_requests_request_count_chk
  check (request_count >= 0 and request_count <= 4);
