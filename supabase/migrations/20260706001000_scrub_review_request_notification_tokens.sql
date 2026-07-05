-- Remove review request magic-link tokens from terminal notification records.
-- Pending/processing email events keep the token until delivery can run; once a
-- notification is sent, skipped, or finally failed, the queued secret is no longer needed.
update public.notification_events
set
  href = nullif(
    regexp_replace(
      replace(
        regexp_replace(href, '([?&])requestToken=[^&]*', '\1', 'g'),
        '?&',
        '?'
      ),
      '[?&]$',
      ''
    ),
    ''
  ),
  updated_at = now()
where event_type like 'review.request.%'
  and status in ('sent', 'skipped', 'failed')
  and href like '%requestToken=%';
