-- Make the database enforce reporter identity for review reports.
-- App code already writes the authenticated user's email; this guard keeps
-- future server paths from storing spoofed or unverified reporter emails.
create or replace function public.review_actor_has_verified_email(
  actor_uuid uuid,
  email_text text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select actor_uuid is not null
    and nullif(btrim(email_text), '') is not null
    and exists (
      select 1
      from auth.users actor
      where actor.id = actor_uuid
        and actor.email_confirmed_at is not null
        and lower(nullif(btrim(actor.email), '')) =
          lower(nullif(btrim(email_text), ''))
    );
$$;

revoke all privileges on function public.review_actor_has_verified_email(uuid, text)
from anon, authenticated, public;

drop trigger if exists review_reports_prevent_origin_mutation on public.review_reports;

update public.review_reports report
set reporter_email = lower(btrim(actor.email))
from auth.users actor
where report.reporter_id = actor.id
  and actor.email_confirmed_at is not null
  and lower(nullif(btrim(actor.email), '')) is distinct from
    lower(nullif(btrim(report.reporter_email), ''));

update public.review_reports report
set
  status = 'dismissed',
  resolution_note = coalesce(
    nullif(report.resolution_note, ''),
    'Dismissed automatically because reporter identity could not be verified.'
  ),
  resolved_at = coalesce(report.resolved_at, now()),
  updated_at = now()
where report.status in ('open', 'reviewing')
  and (
    report.reporter_id is null
    or public.review_actor_has_verified_email(report.reporter_id, report.reporter_email) is not true
  );

create or replace function public.prevent_review_report_origin_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.reporter_id is distinct from old.reporter_id
    or new.reporter_email is distinct from old.reporter_email
    or new.reason is distinct from old.reason
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise exception 'Review report origin fields are immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_review_report_origin_mutation()
from anon, authenticated, public;

create trigger review_reports_prevent_origin_mutation
before update on public.review_reports
for each row
execute function public.prevent_review_report_origin_mutation();

create or replace function public.normalize_review_report_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_email text;
begin
  if new.reporter_id is null then
    raise exception 'Review reports require a reporter.'
      using errcode = '23514';
  end if;

  select lower(nullif(btrim(actor.email), ''))
  into verified_email
  from auth.users actor
  where actor.id = new.reporter_id
    and actor.email_confirmed_at is not null;

  if verified_email is null then
    raise exception 'Review reports require a verified reporter email.'
      using errcode = '23514';
  end if;

  if nullif(btrim(coalesce(new.reporter_email, '')), '') is null then
    new.reporter_email := verified_email;
  else
    new.reporter_email := lower(btrim(new.reporter_email));
  end if;

  if new.reporter_email <> verified_email then
    raise exception 'Review report email must match the verified reporter email.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.normalize_review_report_identity()
from anon, authenticated, public;

drop trigger if exists review_reports_normalize_identity_before_write on public.review_reports;
create trigger review_reports_normalize_identity_before_write
before insert or update of reporter_id, reporter_email on public.review_reports
for each row
execute function public.normalize_review_report_identity();
