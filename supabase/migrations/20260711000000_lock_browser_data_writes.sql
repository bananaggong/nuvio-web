-- Route all application mutations through the server API. RLS remains a
-- read boundary, while table privileges prevent browser-side mass assignment.

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated, public',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end $$;

do $$
declare
  sequence_record record;
begin
  for sequence_record in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format(
      'revoke usage, update on sequence %I.%I from anon, authenticated, public',
      sequence_record.sequence_schema,
      sequence_record.sequence_name
    );
  end loop;
end $$;

alter default privileges in schema public
  revoke all privileges on tables
  from anon, authenticated, public;

alter default privileges in schema public
  revoke all privileges on sequences
  from anon, authenticated, public;

-- Browser clients use Supabase Auth only. Public application data is exposed
-- through server-rendered pages and bounded API routes, not direct table reads.

drop policy if exists "Users can update their own profile" on public.profiles;

create or replace function public.prevent_browser_profile_identity_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is not null
    and (
      new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.email is distinct from old.email
      or new.contact_email is distinct from old.contact_email
    )
  then
    raise insufficient_privilege
      using message = 'Profile identity and authorization fields are server-managed.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_browser_identity_mutation
  on public.profiles;
create trigger profiles_prevent_browser_identity_mutation
before update on public.profiles
for each row execute function public.prevent_browser_profile_identity_mutation();

revoke all privileges on function public.prevent_browser_profile_identity_mutation()
  from anon, authenticated, public;

-- Contact addresses are user-editable and must never become authorization
-- claims. Only the Supabase Auth identity claim is considered here.
create or replace function public.current_user_profile_emails()
returns text[]
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when nullif(lower(trim(coalesce((select auth.jwt()) ->> 'email', ''))), '') is null
      then '{}'::text[]
    else array[lower(trim((select auth.jwt()) ->> 'email'))]
  end;
$$;

revoke all privileges on function public.current_user_profile_emails()
  from anon, public;
grant execute on function public.current_user_profile_emails()
  to authenticated;

create or replace function public.current_user_can_view_program(program_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.programs program
    where program.id = program_uuid
      and (
        program.published_at is not null
        or public.is_admin()
        or (
          program.village_id is not null
          and public.current_user_can_view_village(program.village_id)
        )
      )
  );
$$;

create or replace function public.current_user_can_edit_program(program_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.programs program
      where program.id = program_uuid
        and program.village_id is not null
        and public.current_user_can_edit_village(program.village_id)
    );
$$;

revoke all privileges on function public.current_user_can_view_program(uuid)
  from anon, authenticated, public;
revoke all privileges on function public.current_user_can_edit_program(uuid)
  from anon, authenticated, public;
grant execute on function public.current_user_can_view_program(uuid)
  to anon, authenticated;
grant execute on function public.current_user_can_edit_program(uuid)
  to authenticated;

drop policy if exists "Public can read programs" on public.programs;
drop policy if exists "Public can read published programs" on public.programs;
create policy "Public can read published programs"
on public.programs for select
to anon, authenticated
using (published_at is not null);

drop policy if exists "Host members can read own programs" on public.programs;
create policy "Host members can read own programs"
on public.programs for select
to authenticated
using (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_view_village(village_id)
  )
);

drop policy if exists "Public can read published program application forms"
  on public.program_application_forms;
drop policy if exists "Users can manage their application forms"
  on public.program_application_forms;
create policy "Public can read published program application forms"
on public.program_application_forms for select
to anon, authenticated
using (
  form_kind = 'application'
  and program_id is not null
  and public.current_user_can_view_program(program_id)
);

drop policy if exists "Host members can read own application forms"
  on public.program_application_forms;
create policy "Host members can read own application forms"
on public.program_application_forms for select
to authenticated
using (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_view_program(program_id)
  )
);

drop policy if exists "Host members can manage own programs" on public.programs;
create policy "Host members can manage own programs"
on public.programs for all
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

drop policy if exists "Host members can manage own application forms"
  on public.program_application_forms;
create policy "Host members can manage own application forms"
on public.program_application_forms for all
to authenticated
using (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);

drop policy if exists "Village assets are readable" on public.village_assets;
drop policy if exists "Village members can read own assets" on public.village_assets;
create policy "Village members can read own assets"
on public.village_assets for select
to authenticated
using (
  public.is_admin()
  or public.current_user_can_view_village_slug(village_slug)
);
