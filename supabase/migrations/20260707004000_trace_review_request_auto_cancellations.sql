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
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
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
    public.review_request_event_action(previous_status, new.status),
    (select auth.uid()),
    jsonb_strip_nulls(jsonb_build_object(
      'source', event_source,
      'reason', event_reason,
      'applicationStatus', event_application_status,
      'applicationId', new.application_id,
      'programId', new.program_id,
      'requestCount', new.request_count,
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

create or replace function public.sync_review_state_from_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status is not distinct from new.status
  then
    return new;
  end if;

  if public.application_is_review_eligible(new.id) is not true then
    perform set_config(
      'app.review_request_event_source',
      'application_status_sync',
      true
    );
    perform set_config(
      'app.review_request_event_reason',
      'application_became_ineligible_for_review',
      true
    );
    perform set_config(
      'app.review_request_application_status',
      new.status,
      true
    );

    update public.review_requests request
    set
      cancelled_at = coalesce(request.cancelled_at, now()),
      completed_at = null,
      expires_at = null,
      next_reminder_at = null,
      request_token_expires_at = null,
      request_token_hash = null,
      review_id = null,
      status = 'cancelled',
      updated_at = now()
    where request.application_id = new.id
      and request.status in ('pending', 'sent', 'opened')
      and request.review_id is null;

    perform public.purge_review_helpful_votes_if_not_public(review.id)
    from public.reviews review
    where review.application_id = new.id;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.sync_review_state_from_application_status()
from anon, authenticated, public;

do $$
declare
  target_event record;
begin
  for target_event in
    select
      event.id,
      application.status as application_status
    from public.review_request_events event
    inner join public.review_requests request on request.id = event.request_id
    inner join public.program_applications application on application.id = request.application_id
    where event.actor_id is null
      and event.action = 'cancelled'
      and event.to_status = 'cancelled'
      and event.from_status in ('pending', 'sent', 'opened')
      and event.metadata ->> 'source' = 'database_trigger'
      and request.status = 'cancelled'
      and public.application_is_review_eligible(request.application_id) is not true
  loop
    perform set_config('app.review_audit_enrich_allowed', 'true', true);

    update public.review_request_events event
    set metadata = event.metadata || jsonb_build_object(
      'source', 'application_status_sync',
      'reason', 'application_became_ineligible_for_review',
      'applicationStatus', target_event.application_status,
      'enrichedBy', 'migration'
    )
    where event.id = target_event.id;
  end loop;
end $$;
