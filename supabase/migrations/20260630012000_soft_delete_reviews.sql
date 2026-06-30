drop index if exists public.reviews_application_id_unique_idx;
create unique index reviews_application_id_unique_idx
  on public.reviews(application_id)
  where application_id is not null
    and status <> 'deleted';

create or replace function public.refresh_application_review_submitted(application_uuid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with state as (
    select exists (
      select 1
      from public.reviews review
      where review.application_id = application_uuid
        and review.status::text <> 'deleted'
    ) as has_review
  )
  update public.program_applications application
  set
    review_submitted = state.has_review,
    updated_at = case
      when application.review_submitted is distinct from state.has_review then now()
      else application.updated_at
    end
  from state
  where application.id = application_uuid;
$$;

create or replace function public.sync_application_review_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.application_id is not null then
      perform public.refresh_application_review_submitted(new.application_id);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.application_id is distinct from new.application_id then
      if old.application_id is not null then
        perform public.refresh_application_review_submitted(old.application_id);
      end if;
      if new.application_id is not null then
        perform public.refresh_application_review_submitted(new.application_id);
      end if;
    elsif old.status is distinct from new.status and new.application_id is not null then
      perform public.refresh_application_review_submitted(new.application_id);
    end if;
    return new;
  end if;

  if old.application_id is not null then
    perform public.refresh_application_review_submitted(old.application_id);
  end if;
  return old;
end;
$$;

drop trigger if exists reviews_sync_application_review_submitted on public.reviews;
create trigger reviews_sync_application_review_submitted
after insert or delete or update of application_id, status on public.reviews
for each row
execute function public.sync_application_review_submitted();

create or replace function public.normalize_review_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  application_context record;
begin
  if new.source = 'participant' then
    if new.application_id is null then
      raise exception 'Participant reviews require an application.';
    end if;
    if new.user_id is null then
      raise exception 'Participant reviews require a user.';
    end if;
  end if;

  if new.application_id is not null then
    select
      application.program_id,
      application.program_run_id,
      application.status,
      village.slug as village_slug
    into application_context
    from public.program_applications application
    left join public.programs program on program.id = application.program_id
    left join public.villages village on village.id = program.village_id
    where application.id = new.application_id;

    if not found then
      raise exception 'Review application was not found.';
    end if;
    if new.source <> 'participant' then
      raise exception 'Application-linked reviews must be participant reviews.';
    end if;

    if tg_op = 'INSERT' then
      if application_context.status not in ('accepted', 'checkedIn', 'completed') then
        raise exception 'This application is not eligible for a review yet.';
      end if;
    elsif old.application_id is distinct from new.application_id then
      if application_context.status not in ('accepted', 'checkedIn', 'completed') then
        raise exception 'This application is not eligible for a review yet.';
      end if;
    end if;

    new.program_id := application_context.program_id;
    new.program_run_id := application_context.program_run_id;
    new.village_slug := application_context.village_slug;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status::text in ('hidden', 'deleted') then
    new.hidden_at := coalesce(new.hidden_at, now());
  else
    new.hidden_at := null;
  end if;

  if tg_op = 'INSERT' and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.review_status_event_action(
  previous_status public.review_status,
  next_status public.review_status
)
returns text
language sql
immutable
as $$
  select case
    when previous_status is null then 'created'
    when next_status::text = 'deleted' then 'deleted'
    when previous_status = 'hidden' and next_status <> 'hidden' then 'restored'
    when next_status = 'published' then 'published'
    when next_status = 'hidden' then 'hidden'
    when next_status = 'pending' then 'moved_to_pending'
    when next_status = 'draft' then 'moved_to_draft'
    else 'status_changed'
  end;
$$;

revoke all on function public.review_status_event_action(public.review_status, public.review_status) from public;
grant execute on function public.review_status_event_action(public.review_status, public.review_status) to authenticated;

update public.program_applications application
set review_submitted = exists (
  select 1
  from public.reviews review
  where review.application_id = application.id
    and review.status::text <> 'deleted'
);