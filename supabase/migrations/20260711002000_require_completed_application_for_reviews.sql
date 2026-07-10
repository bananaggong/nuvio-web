create or replace function public.application_is_review_eligible(
  application_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_applications application
    where application.id = application_uuid
      and application.status = 'completed'
      and application.submitted_by is not null
  );
$$;

revoke all privileges on function public.application_is_review_eligible(uuid)
from anon, authenticated, public;
