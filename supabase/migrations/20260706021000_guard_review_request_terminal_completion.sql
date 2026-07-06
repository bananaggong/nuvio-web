-- A submitted review may complete an active review request, but it should not
-- rewrite a request that was already cancelled or expired. Keeping those
-- terminal states intact protects request-conversion reporting.
create or replace function public.sync_review_request_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application_id uuid;
begin
  if tg_op = 'DELETE' then
    target_application_id := old.application_id;
    if target_application_id is not null then
      update public.review_requests request
      set
        status = 'pending',
        review_id = null,
        completed_at = null,
        cancelled_at = null,
        expires_at = null,
        last_requested_at = null,
        next_reminder_at = null,
        request_token_expires_at = null,
        request_token_hash = null,
        updated_at = now()
      where request.application_id = target_application_id
        and request.status = 'completed'
        and not exists (
          select 1
          from public.reviews review
          where review.application_id = target_application_id
            and review.status <> 'deleted'
        );
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.application_id is not null
    and old.application_id is distinct from new.application_id
  then
    update public.review_requests request
    set
      status = 'pending',
      review_id = null,
      completed_at = null,
      cancelled_at = null,
      expires_at = null,
      last_requested_at = null,
      next_reminder_at = null,
      request_token_expires_at = null,
      request_token_hash = null,
      updated_at = now()
    where request.application_id = old.application_id
      and request.status = 'completed'
      and not exists (
        select 1
        from public.reviews review
        where review.application_id = old.application_id
          and review.status <> 'deleted'
      );
  end if;

  target_application_id := new.application_id;
  if target_application_id is null then
    return new;
  end if;

  if new.status = 'deleted' then
    update public.review_requests request
    set
      status = 'pending',
      review_id = null,
      completed_at = null,
      cancelled_at = null,
      expires_at = null,
      last_requested_at = null,
      next_reminder_at = null,
      request_token_expires_at = null,
      request_token_hash = null,
      updated_at = now()
    where request.application_id = target_application_id
      and request.status = 'completed'
      and not exists (
        select 1
        from public.reviews review
        where review.application_id = target_application_id
          and review.status <> 'deleted'
      );
    return new;
  end if;

  update public.review_requests request
  set
    status = 'completed',
    completed_at = coalesce(request.completed_at, new.submitted_at, new.created_at, now()),
    cancelled_at = null,
    next_reminder_at = null,
    request_token_expires_at = null,
    request_token_hash = null,
    review_id = new.id,
    updated_at = now()
  where request.application_id = target_application_id
    and request.status in ('pending', 'sent', 'opened', 'completed');

  return new;
end;
$$;

revoke all privileges on function public.sync_review_request_from_review()
from anon, authenticated, public;

create or replace function public.prevent_terminal_review_request_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status in ('cancelled', 'expired')
    and new.status = 'completed'
  then
    raise exception 'Cancelled or expired review requests cannot be completed automatically.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_terminal_review_request_completion()
from anon, authenticated, public;

drop trigger if exists review_requests_prevent_terminal_completion
on public.review_requests;
create trigger review_requests_prevent_terminal_completion
before update of status, review_id, completed_at
on public.review_requests
for each row
execute function public.prevent_terminal_review_request_completion();
