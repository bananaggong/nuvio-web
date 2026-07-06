update public.reviews
set
  hidden_at = coalesce(hidden_at, now()),
  hidden_reason = left(coalesce(nullif(btrim(hidden_reason), ''), 'missing_public_scope'), 1000),
  status = 'hidden',
  updated_at = now()
where status = 'published'
  and program_id is null
  and nullif(btrim(coalesce(village_slug, '')), '') is null;

create or replace function public.normalize_review_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  application_context record;
begin
  new.village_slug := nullif(btrim(coalesce(new.village_slug, '')), '');

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

    if tg_op = 'INSERT'
      or old.application_id is distinct from new.application_id
    then
      if public.application_is_review_eligible(new.application_id) is not true then
        raise exception 'This application is not eligible for a review yet.';
      end if;
    end if;

    new.program_id := application_context.program_id;
    new.program_run_id := application_context.program_run_id;
    new.village_slug := application_context.village_slug;
  end if;

  if new.status = 'published'
    and new.program_id is null
    and nullif(btrim(coalesce(new.village_slug, '')), '') is null
  then
    raise exception 'Published reviews must be attached to a program or channel.'
      using errcode = '23514';
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

revoke all privileges on function public.normalize_review_write()
from anon, authenticated, public;

alter table public.reviews
  drop constraint if exists reviews_public_scope_chk;

alter table public.reviews
  add constraint reviews_public_scope_chk
  check (
    status <> 'published'
    or program_id is not null
    or nullif(btrim(coalesce(village_slug, '')), '') is not null
  );

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
        review.program_id is not null
        or nullif(btrim(coalesce(review.village_slug, '')), '') is not null
      )
      and public.review_moderation_check_is_current(review.id)
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

delete from public.review_helpful_votes vote
where public.review_is_publicly_visible(vote.review_id) is not true;
