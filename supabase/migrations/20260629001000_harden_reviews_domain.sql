alter table public.reviews
  add column if not exists application_id uuid references public.program_applications(id) on delete set null,
  add column if not exists program_run_id uuid references public.program_runs(id) on delete set null,
  add column if not exists rating integer,
  add column if not exists source text not null default 'host',
  add column if not exists submitted_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists hidden_at timestamptz,
  add column if not exists moderation_note text,
  add column if not exists hidden_reason text;

alter table public.reviews
  alter column status set default 'pending';

update public.reviews
set
  submitted_at = coalesce(submitted_at, created_at),
  published_at = case
    when status = 'published' then coalesce(published_at, created_at)
    else published_at
  end
where submitted_at is null
   or (status = 'published' and published_at is null);

update public.reviews
set source = 'imported'
where source = 'host'
  and user_id is null
  and application_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_rating_range_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_rating_range_chk
      check (rating is null or (rating >= 1 and rating <= 5));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_source_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_source_chk
      check (source in ('participant', 'host', 'admin', 'imported'));
  end if;
end $$;

create unique index if not exists reviews_application_id_unique_idx
  on public.reviews(application_id)
  where application_id is not null;

create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists reviews_application_id_idx on public.reviews(application_id);
create index if not exists reviews_program_run_id_idx on public.reviews(program_run_id);
create index if not exists reviews_published_at_idx on public.reviews(published_at desc);

drop policy if exists "Users can create reviews" on public.reviews;
create policy "Users can create participant reviews"
on public.reviews for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and source = 'participant'
  and status in ('draft', 'pending')
  and application_id is not null
  and public.current_user_can_view_application(application_id)
);

drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update own pending reviews"
on public.reviews for update
to authenticated
using (
  user_id = (select auth.uid())
  and status in ('draft', 'pending')
)
with check (
  user_id = (select auth.uid())
  and source = 'participant'
  and status in ('draft', 'pending')
);

drop policy if exists "Users can read own reviews" on public.reviews;
create policy "Users can read own reviews"
on public.reviews for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    application_id is not null
    and public.current_user_can_view_application(application_id)
  )
);

drop policy if exists "Host members can manage own village reviews" on public.reviews;
create policy "Host members can manage own village reviews"
on public.reviews for all
to authenticated
using (
  public.is_admin()
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);