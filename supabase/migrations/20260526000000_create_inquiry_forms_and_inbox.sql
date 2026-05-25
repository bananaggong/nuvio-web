alter table public.program_application_forms
  add column if not exists form_kind text not null default 'application';

create index if not exists program_application_forms_form_kind_idx
  on public.program_application_forms(form_kind);

create table if not exists public.program_inquiries (
  id uuid primary key default gen_random_uuid(),
  village_id uuid references public.villages(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  form_id uuid references public.program_application_forms(id) on delete set null,
  program_title text,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  title text not null,
  message text not null,
  status text not null default 'new',
  answers jsonb not null default '{}'::jsonb,
  source text not null default 'program',
  submitted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_inquiries_village_id_idx
  on public.program_inquiries(village_id);

create index if not exists program_inquiries_program_id_idx
  on public.program_inquiries(program_id);

create index if not exists program_inquiries_status_idx
  on public.program_inquiries(status);

create index if not exists program_inquiries_created_at_idx
  on public.program_inquiries(created_at);
