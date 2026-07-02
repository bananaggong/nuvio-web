create index if not exists review_requests_status_next_reminder_idx
  on public.review_requests (status, next_reminder_at);