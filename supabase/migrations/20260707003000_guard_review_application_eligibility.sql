create or replace function public.application_is_review_eligible(
  application_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_applications application
    where application.id = application_uuid
      and application.status in ('accepted', 'checkedIn', 'completed')
  );
$$;

revoke all privileges on function public.application_is_review_eligible(uuid)
from anon, authenticated, public;

-- Public review visibility should follow the same verified-participant
-- eligibility used by review creation. Host/imported reviews without an
-- application keep the existing program-publication visibility rule.
create or replace function public.review_is_publicly_visible(review_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews review
    where review.id = review_uuid
      and review.status = 'published'
      and review.published_at is not null
      and review.published_at <= now()
      and (
        review.source <> 'participant'
        or public.application_is_review_eligible(review.application_id)
      )
      and (
        review.program_id is null
        or exists (
          select 1
          from public.programs program
          where program.id = review.program_id
            and program.published_at is not null
        )
      )
      and not exists (
        select 1
        from public.review_visibility_holds hold
        where hold.review_id = review.id
          and hold.status = 'active'
      )
  );
$$;

revoke all privileges on function public.review_is_publicly_visible(uuid)
from anon, authenticated, public;

update public.review_requests request
set
  cancelled_at = coalesce(cancelled_at, now()),
  completed_at = null,
  expires_at = null,
  next_reminder_at = null,
  request_token_expires_at = null,
  request_token_hash = null,
  review_id = null,
  status = 'cancelled',
  updated_at = now()
where request.status in ('pending', 'sent', 'opened')
  and request.review_id is null
  and public.application_is_review_eligible(request.application_id) is not true;

delete from public.review_helpful_votes vote
using public.reviews review
where vote.review_id = review.id
  and review.source = 'participant'
  and public.review_is_publicly_visible(review.id) is not true;

create or replace function public.prevent_ineligible_active_review_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending', 'sent', 'opened')
    and new.review_id is null
    and public.application_is_review_eligible(new.application_id) is not true
  then
    raise exception 'Active review requests require an eligible application.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_ineligible_active_review_request()
from anon, authenticated, public;

drop trigger if exists review_requests_prevent_ineligible_active
on public.review_requests;
create trigger review_requests_prevent_ineligible_active
before insert or update of application_id, status, review_id, request_token_hash
on public.review_requests
for each row
execute function public.prevent_ineligible_active_review_request();

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

drop trigger if exists program_applications_sync_review_state_from_status
on public.program_applications;
create trigger program_applications_sync_review_state_from_status
after insert or update of status
on public.program_applications
for each row
execute function public.sync_review_state_from_application_status();

create or replace function public.prevent_review_publish_with_active_hold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  analysis record;
  is_publish_transition boolean;
  needs_content_analysis boolean;
begin
  if new.status::text = 'published' then
    if new.source = 'participant'
      and public.application_is_review_eligible(new.application_id) is not true
    then
      raise exception 'Participant reviews require an eligible application before publishing.'
        using errcode = '23514';
    end if;

    is_publish_transition := tg_op = 'INSERT'
      or old.status is distinct from new.status;

    needs_content_analysis := is_publish_transition
      or old.title is distinct from new.title
      or old.excerpt is distinct from new.excerpt
      or old.body is distinct from new.body
      or old.images is distinct from new.images;

    if is_publish_transition and exists (
      select 1
      from public.review_visibility_holds hold
      where hold.review_id = new.id
        and hold.status = 'active'
    ) then
      raise exception 'Active review visibility holds must be released before publishing.'
        using errcode = '23514';
    end if;

    if needs_content_analysis then
      select *
      into analysis
      from public.review_moderation_analysis(new.title, new.excerpt, new.body, new.images)
      limit 1;

      if analysis.risk_level = 'high' then
        raise exception 'High-risk review content must be moderated before publishing.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_review_publish_with_active_hold()
from anon, authenticated, public;
