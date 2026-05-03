create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'partner', 'admin');
create type public.program_status as enum ('open', 'upcoming', 'closed', 'earlyClosed');
create type public.theme_key as enum (
  'short',
  'month',
  'workation',
  'local',
  'returnFarm',
  'event',
  'pet',
  'half',
  'daily',
  'family',
  'easy',
  'benefit',
  'exclusive'
);
create type public.period_key as enum ('under4', 'week', 'twoWeeks', 'threeWeeks', 'month');
create type public.announcement_type as enum ('close', 'change', 'notice', 'open');
create type public.review_category as enum (
  'programTip',
  'selected',
  'rejected',
  'trip',
  'free',
  'question'
);
create type public.review_status as enum ('draft', 'published', 'hidden');
create type public.external_source_type as enum ('rss');
create type public.lead_confidence as enum ('high', 'medium', 'low');
create type public.lead_status as enum ('new', 'approved', 'rejected', 'draftCreated');
create type public.lead_decision as enum ('approved', 'rejected');
create type public.partner_submission_status as enum (
  'submitted',
  'reviewing',
  'approved',
  'rejected'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.user_role not null default 'user',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  legacy_id integer unique,
  title text not null,
  slug text not null unique,
  region text not null,
  city text not null,
  is_global boolean not null default false,
  summary text not null,
  description text not null,
  theme public.theme_key not null,
  categories jsonb not null default '[]'::jsonb,
  hashtags jsonb not null default '[]'::jsonb,
  period_key public.period_key not null,
  activity_start date not null,
  activity_end date not null,
  recruit_start date not null,
  recruit_end date not null,
  target text not null,
  capacity text not null,
  announcement text not null,
  subsidy_label text not null,
  subsidy_amount integer not null default 0,
  fee text not null,
  applicants integer not null default 0,
  status public.program_status not null,
  source_name text not null,
  source_url text not null,
  apply_url text not null,
  phone text not null,
  image_url text not null,
  gallery jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  body jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programs_region_idx on public.programs (region);
create index programs_status_idx on public.programs (status);
create index programs_recruit_end_idx on public.programs (recruit_end);

create table public.external_announcement_sources (
  id text primary key,
  name text not null,
  type public.external_source_type not null default 'rss',
  url text not null,
  enabled boolean not null default true,
  keywords jsonb not null default '[]'::jsonb,
  minimum_keyword_matches integer not null default 0,
  notes text,
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.external_announcements (
  id text primary key,
  source_id text references public.external_announcement_sources (id) on delete cascade,
  title text not null,
  body text not null,
  type public.announcement_type not null,
  source_url text not null,
  published_at timestamptz not null,
  relevance integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_id, source_url)
);

create index external_announcements_published_at_idx
  on public.external_announcements (published_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  legacy_id integer unique,
  title text not null,
  type public.announcement_type not null,
  body text not null,
  date timestamptz not null,
  program_id uuid references public.programs (id) on delete set null,
  source_id text,
  source_name text not null default 'NUVIO',
  source_url text,
  is_external boolean not null default false,
  relevance integer not null default 0,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_date_idx on public.announcements (date desc);
create index announcements_program_id_idx on public.announcements (program_id);

create table public.program_leads (
  id uuid primary key default gen_random_uuid(),
  source_announcement_id text unique references public.external_announcements (id) on delete set null,
  title text not null,
  summary text not null,
  source_name text not null,
  source_url text,
  published_at timestamptz not null,
  confidence public.lead_confidence not null default 'low',
  score integer not null default 0,
  suggested_region text,
  suggested_themes jsonb not null default '[]'::jsonb,
  suggested_status public.program_status not null,
  reasons jsonb not null default '[]'::jsonb,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_leads_status_idx on public.program_leads (status);
create index program_leads_score_idx on public.program_leads (score desc);

create table public.program_lead_decisions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.program_leads (id) on delete cascade,
  decision public.lead_decision not null,
  note text,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  legacy_id integer unique,
  program_id uuid references public.programs (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  title text not null,
  category public.review_category not null,
  author_name text not null,
  excerpt text not null,
  body text not null,
  images jsonb not null default '[]'::jsonb,
  likes integer not null default 0,
  comments integer not null default 0,
  badge text,
  status public.review_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_program_id_idx on public.reviews (program_id);
create index reviews_status_idx on public.reviews (status);

create table public.saved_programs (
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create index saved_programs_program_id_idx on public.saved_programs (program_id);

create table public.partner_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  title text not null,
  region text,
  payload jsonb not null default '{}'::jsonb,
  status public.partner_submission_status not null default 'submitted',
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_submissions_status_idx on public.partner_submissions (status);
create index partner_submissions_contact_email_idx on public.partner_submissions (contact_email);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_actor_id_idx on public.admin_audit_logs (actor_id);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger external_announcement_sources_set_updated_at
before update on public.external_announcement_sources
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger program_leads_set_updated_at
before update on public.program_leads
for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create trigger partner_submissions_set_updated_at
before update on public.partner_submissions
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.external_announcement_sources enable row level security;
alter table public.external_announcements enable row level security;
alter table public.announcements enable row level security;
alter table public.program_leads enable row level security;
alter table public.program_lead_decisions enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_programs enable row level security;
alter table public.partner_submissions enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "Profiles are readable by owner or admin"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id or public.is_admin());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read programs"
on public.programs for select
to anon, authenticated
using (true);

create policy "Admins can manage programs"
on public.programs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read external sources"
on public.external_announcement_sources for select
to anon, authenticated
using (enabled = true or public.is_admin());

create policy "Admins can manage external sources"
on public.external_announcement_sources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read external announcements"
on public.external_announcements for select
to anon, authenticated
using (true);

create policy "Admins can manage external announcements"
on public.external_announcements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read announcements"
on public.announcements for select
to anon, authenticated
using (true);

create policy "Admins can manage announcements"
on public.announcements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read program leads"
on public.program_leads for select
to authenticated
using (public.is_admin());

create policy "Admins can manage program leads"
on public.program_leads for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage lead decisions"
on public.program_lead_decisions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read published reviews"
on public.reviews for select
to anon, authenticated
using (status = 'published');

create policy "Users can create reviews"
on public.reviews for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own reviews"
on public.reviews for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Admins can manage reviews"
on public.reviews for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can manage saved programs"
on public.saved_programs for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can create partner submissions"
on public.partner_submissions for insert
to authenticated
with check ((select auth.uid()) = submitted_by);

create policy "Users can read their partner submissions"
on public.partner_submissions for select
to authenticated
using ((select auth.uid()) = submitted_by or public.is_admin());

create policy "Admins can manage partner submissions"
on public.partner_submissions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read audit logs"
on public.admin_audit_logs for select
to authenticated
using (public.is_admin());

create policy "Admins can create audit logs"
on public.admin_audit_logs for insert
to authenticated
with check (public.is_admin());
