-- Phase 1 is additive and remains compatible with the previous worker code.
-- Apply it before deploying code that writes claim tokens and retry metadata.
-- It intentionally contains no cleanup DML.

alter table public.notification_events
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

alter table public.scheduled_messages
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

alter table public.scheduled_messages
  drop constraint if exists scheduled_messages_attempt_count_chk,
  add constraint scheduled_messages_attempt_count_chk
    check (attempt_count >= 0) not valid,
  drop constraint if exists scheduled_messages_max_attempts_chk,
  add constraint scheduled_messages_max_attempts_chk
    check (max_attempts between 1 and 20) not valid;

alter table public.scheduled_messages
  validate constraint scheduled_messages_attempt_count_chk;
alter table public.scheduled_messages
  validate constraint scheduled_messages_max_attempts_chk;

create index if not exists scheduled_messages_delivery_due_idx
  on public.scheduled_messages (
    delivery_status,
    next_attempt_at,
    scheduled_for
  );
