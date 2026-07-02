create or replace function public.prevent_expired_active_review_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending', 'sent', 'opened')
    and new.expires_at is not null
    and new.expires_at <= now() then
    raise exception 'Active review requests cannot be past their expiration timestamp.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_expired_active_review_request() from public;

drop trigger if exists review_requests_prevent_expired_active_status on public.review_requests;
create trigger review_requests_prevent_expired_active_status
before insert or update
on public.review_requests
for each row
execute function public.prevent_expired_active_review_request();

update public.review_requests
set
  next_reminder_at = null,
  status = 'expired',
  updated_at = now()
where status in ('pending', 'sent', 'opened')
  and expires_at is not null
  and expires_at <= now();