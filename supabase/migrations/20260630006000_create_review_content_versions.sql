create table if not exists public.review_content_versions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  version integer not null,
  title text not null,
  category public.review_category not null,
  author_name text not null,
  excerpt text not null,
  body text not null,
  images jsonb not null default '[]'::jsonb,
  rating integer,
  source text not null,
  status public.review_status not null,
  change_source text not null default 'database_trigger',
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists review_content_versions_review_version_idx
  on public.review_content_versions(review_id, version);
create index if not exists review_content_versions_review_id_idx
  on public.review_content_versions(review_id);
create index if not exists review_content_versions_created_at_idx
  on public.review_content_versions(created_at desc);
create index if not exists review_content_versions_changed_by_idx
  on public.review_content_versions(changed_by);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_version_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_version_chk
      check (version >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_title_length_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_title_length_chk
      check (char_length(btrim(title)) between 2 and 120);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_excerpt_length_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_excerpt_length_chk
      check (char_length(btrim(excerpt)) between 1 and 300);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_body_length_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_body_length_chk
      check (char_length(btrim(body)) between 10 and 5000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_images_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_images_chk
      check (public.review_images_are_safe(images));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_rating_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_rating_chk
      check (rating is null or (rating >= 1 and rating <= 5));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_source_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_source_chk
      check (source in ('participant', 'host', 'admin', 'imported'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_content_versions_metadata_shape_chk'
      and conrelid = 'public.review_content_versions'::regclass
  ) then
    alter table public.review_content_versions
      add constraint review_content_versions_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.record_review_content_version_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  if tg_op = 'UPDATE' then
    if old.title is not distinct from new.title
      and old.category is not distinct from new.category
      and old.author_name is not distinct from new.author_name
      and old.excerpt is not distinct from new.excerpt
      and old.body is not distinct from new.body
      and old.images is not distinct from new.images
      and old.rating is not distinct from new.rating
      and old.source is not distinct from new.source
    then
      return new;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('review-content-version:' || new.id::text));

  select coalesce(max(version), 0) + 1
  into next_version
  from public.review_content_versions
  where review_id = new.id;

  insert into public.review_content_versions (
    review_id,
    version,
    title,
    category,
    author_name,
    excerpt,
    body,
    images,
    rating,
    source,
    status,
    change_source,
    changed_by,
    metadata,
    created_at
  ) values (
    new.id,
    next_version,
    new.title,
    new.category,
    new.author_name,
    new.excerpt,
    new.body,
    new.images,
    new.rating,
    new.source,
    new.status,
    'database_trigger',
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'reviewSource', new.source,
      'applicationId', new.application_id,
      'programId', new.program_id
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists reviews_record_content_version_after_write on public.reviews;
create trigger reviews_record_content_version_after_write
after insert or update of title, category, author_name, excerpt, body, images, rating, source
on public.reviews
for each row
execute function public.record_review_content_version_from_review();

insert into public.review_content_versions (
  review_id,
  version,
  title,
  category,
  author_name,
  excerpt,
  body,
  images,
  rating,
  source,
  status,
  change_source,
  metadata,
  created_at
)
select
  review.id,
  1,
  review.title,
  review.category,
  review.author_name,
  review.excerpt,
  review.body,
  review.images,
  review.rating,
  review.source,
  review.status,
  'migration_backfill',
  jsonb_build_object(
    'source', 'migration_backfill',
    'reviewSource', review.source,
    'applicationId', review.application_id,
    'programId', review.program_id
  ),
  coalesce(review.submitted_at, review.created_at, now())
from public.reviews review
where not exists (
  select 1
  from public.review_content_versions version
  where version.review_id = review.id
);

alter table public.review_content_versions enable row level security;

drop policy if exists "Users can read own review content versions" on public.review_content_versions;
create policy "Users can read own review content versions"
on public.review_content_versions for select
to authenticated
using (
  exists (
    select 1
    from public.reviews review
    where review.id = public.review_content_versions.review_id
      and review.user_id = (select auth.uid())
  )
);

drop policy if exists "Host members can read review content versions" on public.review_content_versions;
create policy "Host members can read review content versions"
on public.review_content_versions for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_content_versions.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review content versions" on public.review_content_versions;
create policy "Host members can manage review content versions"
on public.review_content_versions for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_content_versions.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_content_versions.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_content_versions to authenticated;