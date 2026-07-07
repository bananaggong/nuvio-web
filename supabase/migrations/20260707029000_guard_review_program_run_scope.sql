-- Reviews and review requests inherit their program/run context from an
-- application or host draft. A plain FK only proves that the run exists; this
-- guard proves that the run belongs to the same program before the record can
-- feed review eligibility, reporting, or host analytics.
create or replace function public.prevent_program_run_program_mismatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  run_matches boolean;
begin
  if new.program_run_id is null then
    return new;
  end if;

  if new.program_id is null then
    raise exception 'Program run scoped records require a program.'
      using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.program_runs run
    where run.id = new.program_run_id
      and run.program_id = new.program_id
  )
  into run_matches;

  if run_matches is not true then
    raise exception 'Program run must belong to the selected program.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_program_run_program_mismatch()
from anon, authenticated, public;

alter table public.program_applications
  drop constraint if exists program_applications_program_run_program_required_chk;

alter table public.program_applications
  add constraint program_applications_program_run_program_required_chk
  check (program_run_id is null or program_id is not null);

alter table public.reviews
  drop constraint if exists reviews_program_run_program_required_chk;

alter table public.reviews
  add constraint reviews_program_run_program_required_chk
  check (program_run_id is null or program_id is not null);

alter table public.review_requests
  drop constraint if exists review_requests_program_run_program_required_chk;

alter table public.review_requests
  add constraint review_requests_program_run_program_required_chk
  check (program_run_id is null or program_id is not null);

drop trigger if exists program_applications_prevent_program_run_mismatch
on public.program_applications;
create trigger program_applications_prevent_program_run_mismatch
before insert or update of program_id, program_run_id
on public.program_applications
for each row
execute function public.prevent_program_run_program_mismatch();

drop trigger if exists reviews_prevent_program_run_mismatch
on public.reviews;
create trigger reviews_prevent_program_run_mismatch
before insert or update of program_id, program_run_id
on public.reviews
for each row
execute function public.prevent_program_run_program_mismatch();

drop trigger if exists review_requests_prevent_program_run_mismatch
on public.review_requests;
create trigger review_requests_prevent_program_run_mismatch
before insert or update of program_id, program_run_id
on public.review_requests
for each row
execute function public.prevent_program_run_program_mismatch();
