update public.review_requests
set
  request_token_hash = null,
  request_token_expires_at = null,
  updated_at = now()
where status in ('pending', 'sent', 'opened')
  and request_token_expires_at is not null
  and request_token_expires_at <= now();

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

  if new.request_token_hash is not null
    and new.request_token_expires_at is not null
    and new.request_token_expires_at <= now() then
    new.request_token_hash := null;
    new.request_token_expires_at := null;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.normalize_review_request_token_state() from anon, authenticated, public;
