alter table public.program_applications
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

create index if not exists program_applications_submitted_by_idx
  on public.program_applications(submitted_by);

create index if not exists program_applications_program_lower_email_idx
  on public.program_applications(program_id, lower(email));

update public.program_applications as application
set submitted_by = profile.id
from public.profiles as profile
where application.submitted_by is null
  and lower(application.email) = lower(profile.email);
