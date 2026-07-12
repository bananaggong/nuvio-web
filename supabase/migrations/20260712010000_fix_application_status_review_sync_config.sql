-- application_status is a PostgreSQL enum, while set_config accepts text.
-- The missing cast made every application INSERT and status UPDATE fail before
-- the review-request synchronization trigger could finish.
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
      new.status::text,
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
