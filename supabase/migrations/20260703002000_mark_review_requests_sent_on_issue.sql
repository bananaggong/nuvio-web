update public.review_requests
set
  status = 'sent',
  updated_at = now()
where status = 'pending'
  and review_id is null
  and last_requested_at is not null
  and (expires_at is null or expires_at > now());

update public.review_requests
set
  next_reminder_at = null,
  updated_at = now()
where status in ('completed', 'cancelled', 'expired')
  and next_reminder_at is not null;