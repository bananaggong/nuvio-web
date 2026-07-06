create or replace function public.review_request_event_action(
  from_status text,
  to_status text,
  request_count integer,
  previous_request_count integer
)
returns text
language sql
immutable
as $$
  select case
    when from_status is null and to_status = 'pending' then 'created'
    when from_status is null and to_status = 'sent' and coalesce(request_count, 0) > 1 then 'resent'
    when from_status is null and to_status = 'sent' then 'requested'
    when from_status is null and to_status = 'opened' then 'opened'
    when from_status is null and to_status = 'completed' then 'completed'
    when from_status is null and to_status = 'cancelled' then 'cancelled'
    when from_status is null and to_status = 'expired' then 'expired'
    when from_status = 'completed' and to_status <> 'completed' then 'reopened'
    when to_status in ('sent', 'opened')
      and coalesce(request_count, 0) > coalesce(previous_request_count, 0)
      and coalesce(request_count, 0) > 1
    then 'resent'
    when to_status = 'sent' and coalesce(request_count, 0) <= 1 then 'requested'
    when to_status = 'sent' then 'sent'
    when to_status = 'opened' then 'opened'
    when to_status = 'completed' then 'completed'
    when to_status = 'cancelled' then 'cancelled'
    when to_status = 'expired' then 'expired'
    when to_status = 'pending' and from_status in ('cancelled', 'expired') then 'reopened'
    else 'status_changed'
  end;
$$;

create or replace function public.review_request_event_action(
  from_status text,
  to_status text
)
returns text
language sql
immutable
as $$
  select public.review_request_event_action(
    from_status,
    to_status,
    null::integer,
    null::integer
  );
$$;

revoke all privileges on function public.review_request_event_action(text, text)
from anon, authenticated, public;
revoke all privileges on function public.review_request_event_action(text, text, integer, integer)
from anon, authenticated, public;

create or replace function public.record_review_request_event_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_source text;
  event_reason text;
  event_application_status text;
  previous_status text;
  previous_request_count integer;
begin
  if tg_op = 'UPDATE'
    and old.status is not distinct from new.status
    and old.request_count is not distinct from new.request_count
  then
    return new;
  end if;

  event_source := coalesce(
    nullif(current_setting('app.review_request_event_source', true), ''),
    'database_trigger'
  );
  event_reason := nullif(current_setting('app.review_request_event_reason', true), '');
  event_application_status := nullif(
    current_setting('app.review_request_application_status', true),
    ''
  );
  previous_status := case when tg_op = 'INSERT' then null else old.status end;
  previous_request_count := case when tg_op = 'INSERT' then null else old.request_count end;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_request_events (
    request_id,
    from_status,
    to_status,
    action,
    actor_id,
    metadata,
    created_at
  ) values (
    new.id,
    previous_status,
    new.status,
    public.review_request_event_action(
      previous_status,
      new.status,
      new.request_count,
      previous_request_count
    ),
    (select auth.uid()),
    jsonb_strip_nulls(jsonb_build_object(
      'source', event_source,
      'reason', event_reason,
      'applicationStatus', event_application_status,
      'applicationId', new.application_id,
      'programId', new.program_id,
      'requestCount', new.request_count,
      'previousRequestCount', previous_request_count,
      'previousStatus', previous_status,
      'status', new.status
    )),
    now()
  );

  return new;
end;
$$;

revoke all privileges on function public.record_review_request_event_from_request()
from anon, authenticated, public;

drop trigger if exists review_requests_record_event_after_write
on public.review_requests;
create trigger review_requests_record_event_after_write
after insert or update of status, request_count
on public.review_requests
for each row
execute function public.record_review_request_event_from_request();
