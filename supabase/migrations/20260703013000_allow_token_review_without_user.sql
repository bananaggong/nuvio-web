alter table public.reviews
  drop constraint if exists reviews_participant_context_chk;

alter table public.reviews
  add constraint reviews_participant_context_chk
  check (
    (
      source = 'participant'
      and application_id is not null
    )
    or (
      source <> 'participant'
      and application_id is null
    )
  );

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

revoke all privileges on function public.normalize_review_write() from anon, authenticated, public;