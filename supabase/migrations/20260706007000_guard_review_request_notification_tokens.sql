-- Defense in depth for review request magic-link tokens in notification events.
-- Pending/processing email events may need the token for delivery. Terminal
-- events must not retain it.
create or replace function public.sanitize_terminal_review_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type like 'review.request.%'
    and new.status in ('sent', 'skipped', 'failed')
    and new.href like '%requestToken=%'
  then
    new.href := nullif(
      regexp_replace(
        replace(
          regexp_replace(new.href, '([?&])requestToken=[^&]*', '\1', 'g'),
          '?&',
          '?'
        ),
        '[?&]$',
        ''
      ),
      ''
    );
  end if;

  return new;
end;
$$;

revoke all privileges on function public.sanitize_terminal_review_request_notification()
from anon, authenticated, public;

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

drop trigger if exists notification_events_sanitize_review_request_token on public.notification_events;
create trigger notification_events_sanitize_review_request_token
before insert or update of event_type, status, href on public.notification_events
for each row
execute function public.sanitize_terminal_review_request_notification();
