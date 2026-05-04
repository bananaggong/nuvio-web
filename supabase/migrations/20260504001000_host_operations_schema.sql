create type public.application_status as enum (
  'submitted',
  'screening',
  'accepted',
  'rejected',
  'checkedIn',
  'completed'
);
create type public.message_channel as enum ('sms', 'email', 'kakao');
create type public.message_delivery_status as enum (
  'draft',
  'scheduled',
  'sent',
  'failed'
);
create type public.participant_document_type as enum (
  'receipt',
  'signature',
  'review',
  'transfer'
);
create type public.participant_document_status as enum (
  'pending',
  'submitted',
  'approved',
  'rejected'
);
create type public.report_project_status as enum (
  'draft',
  'collecting',
  'ready',
  'submitted'
);
create type public.report_export_status as enum (
  'generated',
  'submitted',
  'revised'
);

create table public.program_application_forms (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs (id) on delete cascade,
  title text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_application_forms_program_id_idx
  on public.program_application_forms (program_id);

create table public.program_applications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  form_id uuid references public.program_application_forms (id) on delete set null,
  applicant_name text not null,
  email text not null,
  phone text,
  status public.application_status not null default 'submitted',
  answers jsonb not null default '{}'::jsonb,
  payment_amount integer not null default 0,
  payment_method text,
  receipt_count integer not null default 0,
  signature_completed boolean not null default false,
  review_submitted boolean not null default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_applications_program_id_idx
  on public.program_applications (program_id);
create index program_applications_status_idx
  on public.program_applications (status);
create index program_applications_email_idx
  on public.program_applications (email);

create table public.application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.program_applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index application_status_events_application_id_idx
  on public.application_status_events (application_id);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs (id) on delete cascade,
  name text not null,
  channel public.message_channel not null default 'sms',
  trigger text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index message_templates_program_id_idx
  on public.message_templates (program_id);

create table public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.message_templates (id) on delete set null,
  application_id uuid references public.program_applications (id) on delete cascade,
  channel public.message_channel not null default 'sms',
  recipient text not null,
  body text not null,
  delivery_status public.message_delivery_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_messages_application_id_idx
  on public.scheduled_messages (application_id);
create index scheduled_messages_delivery_status_idx
  on public.scheduled_messages (delivery_status);

create table public.participant_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.program_applications (id) on delete cascade,
  type public.participant_document_type not null,
  status public.participant_document_status not null default 'pending',
  file_url text,
  amount integer,
  note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participant_documents_application_id_idx
  on public.participant_documents (application_id);
create index participant_documents_status_idx
  on public.participant_documents (status);

create table public.report_projects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs (id) on delete set null,
  name text not null,
  organization_name text not null,
  report_type text not null,
  status public.report_project_status not null default 'draft',
  schema jsonb not null default '{}'::jsonb,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index report_projects_program_id_idx
  on public.report_projects (program_id);
create index report_projects_status_idx
  on public.report_projects (status);

create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_project_id uuid not null references public.report_projects (id) on delete cascade,
  version integer not null default 1,
  status public.report_export_status not null default 'generated',
  payload jsonb not null default '{}'::jsonb,
  file_url text,
  generated_by uuid references auth.users (id) on delete set null,
  generated_at timestamptz not null default now(),
  unique (report_project_id, version)
);

create index report_exports_report_project_id_idx
  on public.report_exports (report_project_id);

create trigger program_application_forms_set_updated_at
before update on public.program_application_forms
for each row execute function public.set_updated_at();

create trigger program_applications_set_updated_at
before update on public.program_applications
for each row execute function public.set_updated_at();

create trigger message_templates_set_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

create trigger scheduled_messages_set_updated_at
before update on public.scheduled_messages
for each row execute function public.set_updated_at();

create trigger participant_documents_set_updated_at
before update on public.participant_documents
for each row execute function public.set_updated_at();

create trigger report_projects_set_updated_at
before update on public.report_projects
for each row execute function public.set_updated_at();

alter table public.program_application_forms enable row level security;
alter table public.program_applications enable row level security;
alter table public.application_status_events enable row level security;
alter table public.message_templates enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.participant_documents enable row level security;
alter table public.report_projects enable row level security;
alter table public.report_exports enable row level security;

create policy "Admins can manage application forms"
on public.program_application_forms for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage applications"
on public.program_applications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage application events"
on public.application_status_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage message templates"
on public.message_templates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage scheduled messages"
on public.scheduled_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage participant documents"
on public.participant_documents for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage report projects"
on public.report_projects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage report exports"
on public.report_exports for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
