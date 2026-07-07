-- Expired review requests should always carry an expiration timestamp that is
-- already in the past. The original normalizer filled missing expires_at values
-- but allowed direct write paths to mark a request expired with a future expiry.
update public.review_requests
set
  expires_at = now(),
  updated_at = now()
where status = 'expired'
  and (expires_at is null or expires_at > now());

create or replace function public.normalize_review_request_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  application_context record;
begin
  select
    application.email,
    application.applicant_name,
    application.program_id,
    application.program_run_id,
    application.status as application_status,
    village.slug as village_slug
  into application_context
  from public.program_applications application
  left join public.programs program on program.id = application.program_id
  left join public.villages village on village.id = program.village_id
  where application.id = new.application_id;

  if not found then
    raise exception 'Review request application was not found.';
  end if;

  if new.status not in ('completed', 'cancelled', 'expired')
    and application_context.application_status not in ('accepted', 'checkedIn', 'completed') then
    raise exception 'This application is not eligible for a review request yet.';
  end if;

  new.program_id := application_context.program_id;
  new.program_run_id := application_context.program_run_id;
  new.village_slug := application_context.village_slug;
  new.recipient_email := lower(btrim(application_context.email));
  new.recipient_name := left(btrim(application_context.applicant_name), 120);

  if tg_op = 'INSERT' then
    new.expires_at := coalesce(new.expires_at, now() + interval '60 days');
  end if;

  if new.status in ('pending', 'sent', 'opened') then
    new.cancelled_at := null;
    new.completed_at := null;
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  else
    new.cancelled_at := null;
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  if new.status = 'expired'
    and (new.expires_at is null or new.expires_at > now())
  then
    new.expires_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all privileges on function public.normalize_review_request_write()
from anon, authenticated, public;
