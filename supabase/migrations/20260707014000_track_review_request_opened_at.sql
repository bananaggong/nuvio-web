alter table public.review_requests
  add column if not exists opened_at timestamptz;

with first_opened_event as (
  select
    event.request_id,
    min(event.created_at) as opened_at
  from public.review_request_events event
  where event.action = 'opened'
  group by event.request_id
)
update public.review_requests request
set opened_at = first_opened_event.opened_at
from first_opened_event
where request.id = first_opened_event.request_id
  and request.opened_at is null;

update public.review_requests
set opened_at = coalesce(opened_at, updated_at, created_at, now())
where status = 'opened'
  and opened_at is null;

update public.review_requests
set opened_at = null
where status in ('pending', 'sent')
  and opened_at is not null;

create index if not exists review_requests_opened_at_idx
  on public.review_requests(opened_at desc)
  where opened_at is not null;

alter table public.review_requests
  drop constraint if exists review_requests_opened_at_state_chk;

alter table public.review_requests
  add constraint review_requests_opened_at_state_chk
  check (
    opened_at is null
    or status in ('opened', 'completed', 'cancelled', 'expired')
  );

create or replace function public.track_review_request_opened_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'opened' and new.opened_at is null then
      new.opened_at := now();
    elsif new.status in ('pending', 'sent') then
      new.opened_at := null;
    end if;

    return new;
  end if;

  if new.status = 'opened' then
    new.opened_at := coalesce(old.opened_at, new.opened_at, now());
  elsif new.status in ('pending', 'sent')
    and old.status in ('completed', 'cancelled', 'expired')
  then
    new.opened_at := null;
  elsif old.status = 'opened'
    and new.status in ('completed', 'cancelled', 'expired')
  then
    new.opened_at := coalesce(old.opened_at, new.opened_at);
  end if;

  return new;
end;
$$;

revoke all privileges on function public.track_review_request_opened_at()
from public;

drop trigger if exists review_requests_track_opened_at
on public.review_requests;

create trigger review_requests_track_opened_at
before insert or update of status, opened_at, review_id
on public.review_requests
for each row
execute function public.track_review_request_opened_at();
