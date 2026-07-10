alter table public.report_projects
  add column if not exists village_id uuid;

update public.report_projects project
set village_id = village.id
from public.villages village
where project.village_id is null
  and lower(trim(coalesce(project.schema ->> 'villageId', ''))) = village.id::text;

update public.report_projects project
set village_id = program.village_id
from public.programs program
where project.village_id is null
  and project.program_id = program.id
  and program.village_id is not null;

update public.report_projects project
set village_id = program.village_id
from public.programs program
where project.village_id is null
  and program.village_id is not null
  and lower(trim(coalesce(project.schema ->> 'programId', ''))) = program.id::text;

update public.report_projects project
set village_id = village.id
from public.villages village
where project.village_id is null
  and lower(trim(coalesce(project.schema ->> 'villageSlug', ''))) = lower(village.slug);

with uniquely_named_projects as (
  select project.id as project_id, village.id as village_id
  from public.report_projects project
  join public.villages village
    on lower(trim(village.name)) = lower(
      coalesce(
        nullif(trim(project.schema ->> 'villageName'), ''),
        trim(project.organization_name)
      )
    )
  where project.village_id is null
    and not exists (
      select 1
      from public.villages duplicate
      where duplicate.id <> village.id
        and lower(trim(duplicate.name)) = lower(trim(village.name))
    )
)
update public.report_projects project
set village_id = candidate.village_id
from uniquely_named_projects candidate
where project.id = candidate.project_id;

do $$
declare
  unresolved_count bigint;
begin
  if exists (
    select 1
    from public.report_projects project
    join public.programs program on program.id = project.program_id
    where program.village_id is not null
      and project.village_id is distinct from program.village_id
  ) then
    raise exception 'Report project village mapping conflicts with its linked program.';
  end if;

  select count(*)
  into unresolved_count
  from public.report_projects
  where village_id is null;

  if unresolved_count > 0 then
    raise exception using
      message = format('Cannot scope %s legacy report project(s) to a village.', unresolved_count),
      hint = 'Populate a valid villageId, programId, villageSlug, or unique villageName before retrying this migration.';
  end if;
end $$;

alter table public.report_projects
  alter column village_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'report_projects_village_id_fkey'
      and conrelid = 'public.report_projects'::regclass
  ) then
    alter table public.report_projects
      add constraint report_projects_village_id_fkey
      foreign key (village_id)
      references public.villages (id)
      on delete restrict;
  end if;
end $$;

create index if not exists report_projects_village_id_idx
  on public.report_projects (village_id);

drop policy if exists "Users can manage their report projects"
  on public.report_projects;
create policy "Village members can manage report projects"
on public.report_projects for all
to authenticated
using (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
)
with check (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
);
