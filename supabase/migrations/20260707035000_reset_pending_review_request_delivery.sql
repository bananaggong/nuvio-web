-- Pending review requests mean "eligible but not currently delivered." When a
-- participant deletes a review or a completed review is otherwise reopened, the
-- delivery attempt counters must be reset with the token/reminder fields. This
-- keeps the delivery-state constraints compatible with review deletion flows.
update public.review_requests
set
  expires_at = null,
  last_requested_at = null,
  next_reminder_at = null,
  opened_at = null,
  request_count = 0,
  request_token_expires_at = null,
  request_token_hash = null,
  updated_at = now()
where status = 'pending'
  and (
    expires_at is not null
    or last_requested_at is not null
    or next_reminder_at is not null
    or opened_at is not null
    or request_count <> 0
    or request_token_expires_at is not null
    or request_token_hash is not null
  );

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
  new.recipient_name := coalesce(
    nullif(left(btrim(coalesce(application_context.applicant_name, '')), 120), ''),
    'Participant'
  );

  if tg_op = 'INSERT' then
    new.expires_at := coalesce(new.expires_at, now() + interval '60 days');
  end if;

  if new.status = 'pending' then
    new.expires_at := null;
    new.last_requested_at := null;
    new.next_reminder_at := null;
    new.opened_at := null;
    new.request_count := 0;
    new.request_token_expires_at := null;
    new.request_token_hash := null;
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
        opened_at = null,
        request_count = 0,
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
      opened_at = null,
      request_count = 0,
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
      opened_at = null,
      request_count = 0,
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
    and (
      request.status = 'completed'
      or (
        request.status in ('pending', 'sent', 'opened')
        and (
          request.expires_at is null
          or request.expires_at > now()
        )
      )
    );

  return new;
end;
$$;

revoke all privileges on function public.sync_review_request_from_review()
from anon, authenticated, public;

alter table public.review_requests
  drop constraint if exists review_requests_pending_delivery_state_chk;

alter table public.review_requests
  add constraint review_requests_pending_delivery_state_chk
  check (
    status <> 'pending'
    or (
      request_count = 0
      and expires_at is null
      and last_requested_at is null
      and next_reminder_at is null
      and opened_at is null
      and request_token_hash is null
      and request_token_expires_at is null
    )
  );
