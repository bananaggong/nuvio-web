-- Audit ledgers duplicate parent review context so host tools can read events
-- without joining every parent row. Make the database verify those duplicated
-- fields still match the parent report/hold at write time.
create or replace function public.validate_review_report_event_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_report record;
begin
  select report.review_id, report.reason
  into parent_report
  from public.review_reports report
  where report.id = new.report_id;

  if not found then
    raise exception 'Review report event parent report was not found.'
      using errcode = '23503';
  end if;

  if new.review_id is distinct from parent_report.review_id then
    raise exception 'Review report event review snapshot does not match its parent report.'
      using errcode = '23514';
  end if;

  if new.reason is distinct from parent_report.reason then
    raise exception 'Review report event reason snapshot does not match its parent report.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.validate_review_report_event_parent()
from anon, authenticated, public;

create or replace function public.validate_review_visibility_hold_event_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_hold record;
begin
  select
    hold.review_id,
    hold.source_type,
    hold.source_id,
    hold.reason
  into parent_hold
  from public.review_visibility_holds hold
  where hold.id = new.hold_id;

  if not found then
    raise exception 'Review visibility hold event parent hold was not found.'
      using errcode = '23503';
  end if;

  if new.review_id is distinct from parent_hold.review_id
    or new.source_type is distinct from parent_hold.source_type
    or new.source_id is distinct from parent_hold.source_id
    or new.reason is distinct from parent_hold.reason
  then
    raise exception 'Review visibility hold event parent snapshot does not match its parent hold.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.validate_review_visibility_hold_event_parent()
from anon, authenticated, public;

drop trigger if exists review_report_events_validate_parent
on public.review_report_events;
create trigger review_report_events_validate_parent
before insert or update of report_id, review_id, reason
on public.review_report_events
for each row
execute function public.validate_review_report_event_parent();

drop trigger if exists review_visibility_hold_events_validate_parent
on public.review_visibility_hold_events;
create trigger review_visibility_hold_events_validate_parent
before insert or update of hold_id, review_id, source_type, source_id, reason
on public.review_visibility_hold_events
for each row
execute function public.validate_review_visibility_hold_event_parent();
