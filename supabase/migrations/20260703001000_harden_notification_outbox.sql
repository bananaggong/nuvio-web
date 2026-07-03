alter type public.notification_event_status add value if not exists 'processing';

alter table public.notification_events
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists provider_message_id text;

alter table public.notification_events
  drop constraint if exists notification_events_attempt_count_check,
  add constraint notification_events_attempt_count_check check (attempt_count >= 0);

alter table public.notification_events
  drop constraint if exists notification_events_max_attempts_check,
  add constraint notification_events_max_attempts_check check (max_attempts between 1 and 20);

create index if not exists notification_events_delivery_due_idx
  on public.notification_events (status, next_attempt_at, scheduled_for, created_at);