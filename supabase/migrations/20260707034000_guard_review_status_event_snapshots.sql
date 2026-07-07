-- Status events duplicate immutable-ish parent review context inside metadata so
-- host audit views can be read without an additional parent join. Validate the
-- duplicated snapshot fields whenever an event is written or enriched.
create or replace function public.validate_review_status_event_parent_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_review record;
begin
  select review.source, review.application_id, review.program_id
  into parent_review
  from public.reviews review
  where review.id = new.review_id;

  if not found then
    raise exception 'Review status event parent review was not found.'
      using errcode = '23503';
  end if;

  if new.metadata ? 'reviewSource'
    and new.metadata ->> 'reviewSource' is distinct from parent_review.source
  then
    raise exception 'Review status event review source snapshot does not match its parent review.'
      using errcode = '23514';
  end if;

  if new.metadata ? 'applicationId'
    and nullif(new.metadata ->> 'applicationId', '') is distinct from parent_review.application_id::text
  then
    raise exception 'Review status event application snapshot does not match its parent review.'
      using errcode = '23514';
  end if;

  if new.metadata ? 'programId'
    and nullif(new.metadata ->> 'programId', '') is distinct from parent_review.program_id::text
  then
    raise exception 'Review status event program snapshot does not match its parent review.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.validate_review_status_event_parent_snapshot()
from anon, authenticated, public;

drop trigger if exists review_status_events_validate_parent_snapshot
on public.review_status_events;

create trigger review_status_events_validate_parent_snapshot
before insert or update of review_id, metadata
on public.review_status_events
for each row
execute function public.validate_review_status_event_parent_snapshot();
