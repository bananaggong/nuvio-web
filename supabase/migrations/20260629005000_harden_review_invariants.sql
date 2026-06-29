create or replace function public.current_user_can_review_application(application_uuid uuid)
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
      and (
        application.submitted_by = (select auth.uid())
        or lower(application.email) = any(public.current_user_profile_emails())
      )
  );
$$;

revoke all on function public.current_user_can_review_application(uuid) from public;
grant execute on function public.current_user_can_review_application(uuid) to authenticated;

update public.reviews
set
  title = left(
    case
      when char_length(btrim(coalesce(title, ''))) >= 2 then btrim(title)
      else 'Review'
    end,
    120
  ),
  excerpt = left(
    case
      when char_length(btrim(coalesce(excerpt, ''))) >= 1 then btrim(excerpt)
      when char_length(btrim(coalesce(body, ''))) >= 1 then btrim(body)
      else 'Review summary'
    end,
    300
  ),
  body = left(
    case
      when char_length(btrim(coalesce(body, ''))) >= 10 then btrim(body)
      when char_length(btrim(coalesce(excerpt, ''))) >= 10 then btrim(excerpt)
      else 'Review body'
    end,
    5000
  ),
  images = coalesce(
    (
      select jsonb_agg(image_value)
      from (
        select image_value
        from jsonb_array_elements(
          case when jsonb_typeof(images) = 'array' then images else '[]'::jsonb end
        ) with ordinality as image_items(image_value, image_position)
        where image_position <= 6
      ) limited_images
    ),
    '[]'::jsonb
  );

update public.reviews
set
  application_id = null,
  program_run_id = null
where source <> 'participant'
  and application_id is not null;

update public.reviews
set
  source = 'host',
  application_id = null,
  program_run_id = null
where source = 'participant'
  and (application_id is null or user_id is null);

update public.review_reports
set
  message = left(message, 1000)
where message is not null
  and char_length(message) > 1000;

update public.review_reports
set resolved_at = coalesce(resolved_at, updated_at, created_at, now())
where status in ('resolved', 'dismissed')
  and resolved_at is null;

update public.review_host_replies
set body = left(
  case
    when char_length(btrim(coalesce(body, ''))) >= 2 then btrim(body)
    else 'OK'
  end,
  2000
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_title_length_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_title_length_chk
      check (char_length(btrim(title)) between 2 and 120);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_excerpt_length_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_excerpt_length_chk
      check (char_length(btrim(excerpt)) between 1 and 300);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_body_length_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_body_length_chk
      check (char_length(btrim(body)) between 10 and 5000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_images_shape_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_images_shape_chk
      check (
        jsonb_typeof(images) = 'array'
        and jsonb_array_length(images) <= 6
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_participant_context_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_participant_context_chk
      check (
        (
          source = 'participant'
          and application_id is not null
          and user_id is not null
        )
        or (
          source <> 'participant'
          and application_id is null
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_reports_message_length_chk'
      and conrelid = 'public.review_reports'::regclass
  ) then
    alter table public.review_reports
      add constraint review_reports_message_length_chk
      check (message is null or char_length(message) <= 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_reports_resolution_state_chk'
      and conrelid = 'public.review_reports'::regclass
  ) then
    alter table public.review_reports
      add constraint review_reports_resolution_state_chk
      check (
        status not in ('resolved', 'dismissed')
        or resolved_at is not null
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_replies_body_length_chk'
      and conrelid = 'public.review_host_replies'::regclass
  ) then
    alter table public.review_host_replies
      add constraint review_host_replies_body_length_chk
      check (char_length(btrim(body)) between 2 and 2000);
  end if;
end $$;

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

  if new.status = 'hidden' then
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

drop trigger if exists reviews_normalize_before_write on public.reviews;
create trigger reviews_normalize_before_write
before insert or update on public.reviews
for each row
execute function public.normalize_review_write();

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
after insert or delete or update of application_id on public.reviews
for each row
execute function public.sync_application_review_submitted();

drop policy if exists "Users can create participant reviews" on public.reviews;
create policy "Users can create participant reviews"
on public.reviews for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and source = 'participant'
  and status in ('draft', 'pending')
  and application_id is not null
  and public.current_user_can_review_application(application_id)
);

drop policy if exists "Users can update own pending reviews" on public.reviews;
create policy "Users can update own pending reviews"
on public.reviews for update
to authenticated
using (
  user_id = (select auth.uid())
  and source = 'participant'
  and status in ('draft', 'pending')
)
with check (
  user_id = (select auth.uid())
  and source = 'participant'
  and status in ('draft', 'pending')
  and application_id is not null
  and public.current_user_can_review_application(application_id)
);

drop policy if exists "Users can manage own review helpful votes" on public.review_helpful_votes;
create policy "Users can manage own review helpful votes"
on public.review_helpful_votes for all
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.status = 'published'
      and (r.user_id is null or r.user_id <> (select auth.uid()))
  )
);
