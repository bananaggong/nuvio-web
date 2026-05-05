create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  city text not null,
  tagline text not null,
  summary text not null,
  description text not null,
  hero_image_url text not null,
  logo_text text,
  brand_color text not null default '#0f766e',
  accent_color text not null default '#f59e0b',
  instagram_url text,
  kakao_url text,
  contact_email text,
  contact_phone text,
  address text,
  program_ids jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  subdomain text,
  custom_domain text,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists villages_slug_idx
  on public.villages (slug);

create unique index if not exists villages_subdomain_idx
  on public.villages (subdomain)
  where subdomain is not null;

create unique index if not exists villages_custom_domain_idx
  on public.villages (custom_domain)
  where custom_domain is not null;

create index if not exists villages_region_idx
  on public.villages (region);

create index if not exists villages_published_at_idx
  on public.villages (published_at desc);

alter table public.programs
  add column if not exists village_id uuid references public.villages (id) on delete set null;

create index if not exists programs_village_id_idx
  on public.programs (village_id);

drop trigger if exists villages_set_updated_at on public.villages;

create trigger villages_set_updated_at
before update on public.villages
for each row execute function public.set_updated_at();

alter table public.villages enable row level security;

drop policy if exists "Public can read published villages" on public.villages;
create policy "Public can read published villages"
on public.villages for select
to anon, authenticated
using (published_at is not null or public.is_admin());

drop policy if exists "Admins can manage villages" on public.villages;
create policy "Admins can manage villages"
on public.villages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
