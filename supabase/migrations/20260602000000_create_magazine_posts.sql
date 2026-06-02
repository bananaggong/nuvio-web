create type public.magazine_post_status as enum ('draft', 'published', 'archived');

create table public.magazine_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  subtitle text,
  excerpt text,
  category text not null default 'local',
  cover_image_url text,
  cover_image_alt text,
  content_json jsonb not null default '{}'::jsonb,
  content_html text not null,
  status public.magazine_post_status not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index magazine_posts_slug_idx
  on public.magazine_posts (slug);

create index magazine_posts_status_idx
  on public.magazine_posts (status);

create index magazine_posts_published_at_idx
  on public.magazine_posts (published_at desc);

create index magazine_posts_category_idx
  on public.magazine_posts (category);

create index magazine_posts_author_id_idx
  on public.magazine_posts (author_id);

create trigger magazine_posts_set_updated_at
before update on public.magazine_posts
for each row execute function public.set_updated_at();

alter table public.magazine_posts enable row level security;

create policy "Public can read published magazine posts"
on public.magazine_posts for select
to anon, authenticated
using (status = 'published' and archived_at is null);

create policy "Admins can read all magazine posts"
on public.magazine_posts for select
to authenticated
using (public.is_admin());

create policy "Admins can create magazine posts"
on public.magazine_posts for insert
to authenticated
with check (public.is_admin() and author_id = (select auth.uid()));

create policy "Admins can update magazine posts"
on public.magazine_posts for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'magazine-assets',
  'magazine-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read magazine assets" on storage.objects;
drop policy if exists "Admins can upload magazine assets" on storage.objects;
drop policy if exists "Admins can update magazine assets" on storage.objects;
drop policy if exists "Admins can delete magazine assets" on storage.objects;

create policy "Public can read magazine assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'magazine-assets');

create policy "Admins can upload magazine assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'magazine-assets' and public.is_admin());

create policy "Admins can update magazine assets"
on storage.objects for update
to authenticated
using (bucket_id = 'magazine-assets' and public.is_admin())
with check (bucket_id = 'magazine-assets' and public.is_admin());

create policy "Admins can delete magazine assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'magazine-assets' and public.is_admin());
