do $$
begin
  if not exists (select 1 from pg_type where typname = 'village_page_section_status') then
    create type public.village_page_section_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

create table if not exists public.village_page_sections (
  id uuid primary key default gen_random_uuid(),
  village_slug text not null,
  page_key text not null default 'home',
  section_key text not null,
  section_type text not null,
  label text not null,
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb,
  order_index integer not null default 100,
  published_order_index integer,
  visible boolean not null default true,
  published_visible boolean,
  status public.village_page_section_status not null default 'draft',
  published_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists village_page_sections_unique_idx
  on public.village_page_sections (village_slug, page_key, section_key);

create index if not exists village_page_sections_public_idx
  on public.village_page_sections (village_slug, page_key, published_at);

create index if not exists village_page_sections_status_idx
  on public.village_page_sections (status);

create table if not exists public.village_page_revisions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.village_page_sections(id) on delete cascade,
  village_slug text not null,
  page_key text not null,
  section_key text not null,
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 100,
  visible boolean not null default true,
  published_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists village_page_revisions_section_id_idx
  on public.village_page_revisions (section_id);

create index if not exists village_page_revisions_page_idx
  on public.village_page_revisions (village_slug, page_key, created_at);

create table if not exists public.village_assets (
  id uuid primary key default gen_random_uuid(),
  village_slug text not null,
  file_name text not null,
  url text not null,
  alt_text text,
  usage text not null default 'page',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists village_assets_village_slug_idx
  on public.village_assets (village_slug);

create index if not exists village_assets_usage_idx
  on public.village_assets (usage);

alter table public.village_page_sections enable row level security;
alter table public.village_page_revisions enable row level security;
alter table public.village_assets enable row level security;

drop policy if exists "Published village page sections are readable" on public.village_page_sections;
create policy "Published village page sections are readable"
on public.village_page_sections for select
using (published_at is not null and coalesce(published_visible, true) = true);

drop policy if exists "Admins manage village page sections" on public.village_page_sections;
create policy "Admins manage village page sections"
on public.village_page_sections for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read village page revisions" on public.village_page_revisions;
create policy "Admins read village page revisions"
on public.village_page_revisions for select
using (public.is_admin());

drop policy if exists "Admins create village page revisions" on public.village_page_revisions;
create policy "Admins create village page revisions"
on public.village_page_revisions for insert
with check (public.is_admin());

drop policy if exists "Village assets are readable" on public.village_assets;
create policy "Village assets are readable"
on public.village_assets for select
using (true);

drop policy if exists "Admins manage village assets" on public.village_assets;
create policy "Admins manage village assets"
on public.village_assets for all
using (public.is_admin())
with check (public.is_admin());
