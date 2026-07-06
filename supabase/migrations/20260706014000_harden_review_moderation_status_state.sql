update public.reviews
set
  hidden_reason = case
    when status::text = 'hidden' then
      left(coalesce(nullif(btrim(hidden_reason), ''), 'moderation_hidden'), 1000)
    when status::text = 'deleted' then
      left(coalesce(nullif(btrim(hidden_reason), ''), 'deleted'), 1000)
    else null
  end,
  hidden_at = case
    when status::text in ('hidden', 'deleted') then coalesce(hidden_at, updated_at, created_at, now())
    else null
  end,
  published_at = case
    when status::text = 'published' then coalesce(published_at, created_at, now())
    else published_at
  end
where
  (
    status::text in ('hidden', 'deleted')
    and (
      hidden_at is null
      or nullif(btrim(coalesce(hidden_reason, '')), '') is null
      or char_length(hidden_reason) > 1000
    )
  )
  or (
    status::text not in ('hidden', 'deleted')
    and (hidden_at is not null or hidden_reason is not null)
  )
  or (status::text = 'published' and published_at is null);

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
    if new.status::text = 'draft' then
      raise exception 'Participant reviews cannot be drafts.';
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
    new.hidden_reason := nullif(btrim(coalesce(new.hidden_reason, '')), '');
  else
    new.hidden_at := null;
    new.hidden_reason := null;
  end if;

  if tg_op = 'INSERT' and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

revoke all privileges on function public.normalize_review_write() from anon, authenticated, public;

alter table public.reviews
  drop constraint if exists reviews_participant_status_chk,
  drop constraint if exists reviews_status_timestamp_state_chk,
  drop constraint if exists reviews_hidden_reason_state_chk;

alter table public.reviews
  add constraint reviews_participant_status_chk
    check (source <> 'participant' or status::text <> 'draft'),
  add constraint reviews_status_timestamp_state_chk
    check (
      (status::text <> 'published' or published_at is not null)
      and (status::text not in ('hidden', 'deleted') or hidden_at is not null)
      and (status::text in ('hidden', 'deleted') or hidden_at is null)
    ),
  add constraint reviews_hidden_reason_state_chk
    check (
      (
        status::text in ('hidden', 'deleted')
        and nullif(btrim(coalesce(hidden_reason, '')), '') is not null
        and char_length(hidden_reason) <= 1000
      )
      or (
        status::text not in ('hidden', 'deleted')
        and hidden_reason is null
      )
    );
