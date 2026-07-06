alter table public.user_notifications
  add column if not exists dedupe_key text;

alter table public.user_notifications
  drop constraint if exists user_notifications_dedupe_key_length_chk;

alter table public.user_notifications
  add constraint user_notifications_dedupe_key_length_chk
  check (dedupe_key is null or char_length(dedupe_key) <= 240);

with candidates as (
  select
    id,
    created_at,
    concat_ws(
      ':',
      'review-request',
      'inApp',
      type,
      metadata ->> 'requestId',
      coalesce(nullif(metadata ->> 'requestCount', ''), '1')
    ) as generated_key
  from public.user_notifications
  where dedupe_key is null
    and type in ('review.request.created', 'review.request.reminder')
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
update public.user_notifications notification
set dedupe_key = ranked.generated_key
from ranked
where notification.id = ranked.id
  and ranked.row_number = 1;

create unique index if not exists user_notifications_dedupe_key_unique_idx
  on public.user_notifications(dedupe_key)
  where dedupe_key is not null;
