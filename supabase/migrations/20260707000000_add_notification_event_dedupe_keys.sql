alter table public.notification_events
  add column if not exists dedupe_key text;

alter table public.notification_events
  drop constraint if exists notification_events_dedupe_key_length_chk;

alter table public.notification_events
  add constraint notification_events_dedupe_key_length_chk
  check (dedupe_key is null or char_length(dedupe_key) <= 240);

with candidates as (
  select
    id,
    created_at,
    concat_ws(
      ':',
      'review-request',
      channel::text,
      event_type,
      metadata ->> 'requestId',
      coalesce(nullif(metadata ->> 'requestCount', ''), '1')
    ) as generated_key
  from public.notification_events
  where dedupe_key is null
    and channel = 'email'
    and event_type in ('review.request.created', 'review.request.reminder')
    and nullif(metadata ->> 'requestId', '') is not null
),
ranked as (
  select
    id,
    generated_key,
    row_number() over (
      partition by generated_key
      order by created_at asc, id asc
    ) as row_number
  from candidates
)
update public.notification_events event
set
  dedupe_key = ranked.generated_key,
  updated_at = now()
from ranked
where event.id = ranked.id
  and ranked.row_number = 1;

create unique index if not exists notification_events_dedupe_key_unique_idx
  on public.notification_events(dedupe_key)
  where dedupe_key is not null;
