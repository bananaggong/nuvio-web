alter table public.saved_programs
  add column if not exists bookmarked boolean not null default true,
  add column if not exists alert_enabled boolean not null default false,
  add column if not exists tracking_enabled boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists saved_programs_user_updated_idx
  on public.saved_programs (user_id, updated_at);

drop trigger if exists saved_programs_set_updated_at
  on public.saved_programs;
create trigger saved_programs_set_updated_at
before update on public.saved_programs
for each row execute function public.set_updated_at();

alter table public.program_application_forms
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists program_application_forms_created_by_idx
  on public.program_application_forms (created_by);

drop policy if exists "Users can manage their application forms"
  on public.program_application_forms;
create policy "Users can manage their application forms"
on public.program_application_forms for all
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

alter table public.message_campaigns
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists message_campaigns_created_by_idx
  on public.message_campaigns (created_by);

drop trigger if exists message_campaigns_set_updated_at
  on public.message_campaigns;
create trigger message_campaigns_set_updated_at
before update on public.message_campaigns
for each row execute function public.set_updated_at();

alter table public.message_campaigns enable row level security;

drop policy if exists "Users can manage their message campaigns"
  on public.message_campaigns;
create policy "Users can manage their message campaigns"
on public.message_campaigns for all
to authenticated
using ((select auth.uid()) = created_by or public.is_admin())
with check ((select auth.uid()) = created_by or public.is_admin());

alter table public.report_projects
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists report_projects_created_by_idx
  on public.report_projects (created_by);

drop policy if exists "Users can manage their report projects"
  on public.report_projects;
create policy "Users can manage their report projects"
on public.report_projects for all
to authenticated
using ((select auth.uid()) = created_by or public.is_admin())
with check ((select auth.uid()) = created_by or public.is_admin());
