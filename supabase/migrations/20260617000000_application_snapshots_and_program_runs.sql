create table if not exists public.program_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  title text not null,
  slug text not null default 'default',
  recruit_start date not null,
  recruit_end date not null,
  activity_start date not null,
  activity_end date not null,
  capacity text not null,
  fee text not null,
  status public.program_status not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists program_runs_program_slug_idx
  on public.program_runs (program_id, slug);
create index if not exists program_runs_program_id_idx
  on public.program_runs (program_id);
create index if not exists program_runs_status_idx
  on public.program_runs (status);
create index if not exists program_runs_recruit_end_idx
  on public.program_runs (recruit_end);

drop trigger if exists program_runs_set_updated_at on public.program_runs;
create trigger program_runs_set_updated_at
before update on public.program_runs
for each row execute function public.set_updated_at();

insert into public.program_runs (
  program_id,
  title,
  slug,
  recruit_start,
  recruit_end,
  activity_start,
  activity_end,
  capacity,
  fee,
  status,
  metadata
)
select
  programs.id,
  'Default run',
  'default',
  programs.recruit_start,
  programs.recruit_end,
  programs.activity_start,
  programs.activity_end,
  programs.capacity,
  programs.fee,
  programs.status,
  jsonb_build_object('source', 'programs_backfill')
from public.programs
where not exists (
  select 1
  from public.program_runs
  where program_runs.program_id = programs.id
    and program_runs.slug = 'default'
);

alter table public.program_applications
  add column if not exists program_run_id uuid references public.program_runs(id) on delete set null,
  add column if not exists form_snapshot jsonb,
  add column if not exists consent_snapshot jsonb;

create index if not exists program_applications_program_run_id_idx
  on public.program_applications (program_run_id);

update public.program_applications as application
set program_run_id = program_runs.id
from public.program_runs
where application.program_run_id is null
  and program_runs.program_id = application.program_id
  and program_runs.slug = 'default';

update public.program_applications as application
set form_snapshot = jsonb_build_object(
  'snapshotVersion', 1,
  'sourceFormId', form_template.id,
  'id', form_template.id,
  'name', form_template.title,
  'description', coalesce(form_template.description, ''),
  'formKind', coalesce(form_template.form_kind, 'application'),
  'programId', coalesce(form_template.program_id::text, ''),
  'programTitle', coalesce(form_template.program_title, ''),
  'blocks', form_template.fields,
  'fields', form_template.fields,
  'updatedAt', form_template.updated_at,
  'capturedAt', application.submitted_at,
  'source', 'backfill'
)
from public.program_application_forms as form_template
where application.form_snapshot is null
  and application.form_id = form_template.id;

update public.program_applications
set consent_snapshot = jsonb_build_object(
  'snapshotVersion', 1,
  'capturedAt', submitted_at,
  'source', 'answers.legalConsent',
  'consent', answers -> 'legalConsent'
)
where consent_snapshot is null
  and answers ? 'legalConsent';

alter table public.program_runs enable row level security;

drop policy if exists "Public can read published program runs" on public.program_runs;
create policy "Public can read published program runs"
on public.program_runs for select
to anon, authenticated
using (
  exists (
    select 1
    from public.programs
    where programs.id = program_runs.program_id
      and programs.published_at is not null
  )
);

drop policy if exists "Host members can read own program runs" on public.program_runs;
create policy "Host members can read own program runs"
on public.program_runs for select
to authenticated
using (public.current_user_can_view_program(program_id));

drop policy if exists "Host members can manage own program runs" on public.program_runs;
create policy "Host members can manage own program runs"
on public.program_runs for all
to authenticated
using (
  public.is_admin()
  or public.current_user_can_edit_program(program_id)
)
with check (
  public.is_admin()
  or public.current_user_can_edit_program(program_id)
);
