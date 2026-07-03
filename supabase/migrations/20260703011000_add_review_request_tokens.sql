alter table public.review_requests
  add column if not exists request_token_hash text,
  add column if not exists request_token_expires_at timestamptz;

create unique index if not exists review_requests_token_hash_unique_idx
  on public.review_requests(request_token_hash)
  where request_token_hash is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_token_hash_chk'
      and conrelid = 'public.review_requests'::regclass
  ) then
    alter table public.review_requests
      add constraint review_requests_token_hash_chk
      check (request_token_hash is null or request_token_hash ~ '^[0-9a-f]{64}$');
  end if;
end $$;

create or replace function public.normalize_review_request_token_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('completed', 'cancelled', 'expired') then
    new.request_token_hash := null;
    new.request_token_expires_at := null;
  elsif new.request_token_hash is null then
    new.request_token_expires_at := null;
  elsif new.request_token_expires_at is null then
    new.request_token_expires_at := coalesce(new.expires_at, now() + interval '60 days');
  end if;

  if new.request_token_expires_at is not null
    and new.expires_at is not null
    and new.request_token_expires_at > new.expires_at then
    new.request_token_expires_at := new.expires_at;
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_review_request_token_state() from public;

drop trigger if exists review_requests_token_state_before_write on public.review_requests;
create trigger review_requests_token_state_before_write
before insert or update
on public.review_requests
for each row
execute function public.normalize_review_request_token_state();

update public.review_requests
set
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where status in ('completed', 'cancelled', 'expired')
  and (request_token_hash is not null or request_token_expires_at is not null);