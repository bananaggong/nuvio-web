-- Harden public API access with ownership-based RLS.
-- Principle: public users can read only explicitly published marketing content;
-- authenticated users can read/write only their own account data or villages
-- they are actively assigned to manage.

create or replace function public.current_user_profile_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(value), '{}'::text[])
  from (
    select lower(nullif(email, '')) as value
    from public.profiles
    where id = (select auth.uid())
    union
    select lower(nullif(contact_email, '')) as value
    from public.profiles
    where id = (select auth.uid())
  ) emails
  where value is not null;
$$;

create or replace function public.current_user_has_village_role(
  village_uuid uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.host_village_memberships membership
      where membership.village_id = village_uuid
        and membership.user_id = (select auth.uid())
        and membership.status::text = 'active'
        and membership.role::text = any(allowed_roles)
    );
$$;

create or replace function public.current_user_can_view_village(village_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_village_role(
    village_uuid,
    array['owner', 'manager', 'editor', 'viewer']
  );
$$;

create or replace function public.current_user_can_edit_village(village_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_village_role(
    village_uuid,
    array['owner', 'manager', 'editor']
  );
$$;

create or replace function public.current_user_can_admin_village(village_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_village_role(
    village_uuid,
    array['owner', 'manager']
  );
$$;

create or replace function public.current_user_can_view_village_slug(village_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.villages village
      where village.slug = lower(trim(village_slug))
        and public.current_user_can_view_village(village.id)
    );
$$;

create or replace function public.current_user_can_edit_village_slug(village_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.villages village
      where village.slug = lower(trim(village_slug))
        and public.current_user_can_edit_village(village.id)
    );
$$;

create or replace function public.current_user_can_admin_village_slug(village_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.villages village
      where village.slug = lower(trim(village_slug))
        and public.current_user_can_admin_village(village.id)
    );
$$;

create or replace function public.current_user_can_view_program(program_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.programs program
    where program.id = program_uuid
      and (
        program.published_at is not null
        or program.created_by = (select auth.uid())
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
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.programs program
      where program.id = program_uuid
        and (
          program.created_by = (select auth.uid())
          or (
            program.village_id is not null
            and public.current_user_can_edit_village(program.village_id)
          )
        )
    );
$$;

create or replace function public.current_user_can_view_application(application_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.program_applications application
      left join public.programs program on program.id = application.program_id
      where application.id = application_uuid
        and (
          lower(application.email) = any(public.current_user_profile_emails())
          or (
            program.village_id is not null
            and public.current_user_can_view_village(program.village_id)
          )
        )
    );
$$;

create or replace function public.current_user_can_edit_application(application_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.program_applications application
      join public.programs program on program.id = application.program_id
      where application.id = application_uuid
        and program.village_id is not null
        and public.current_user_can_edit_village(program.village_id)
    );
$$;

revoke all on function public.current_user_profile_emails() from public;
revoke all on function public.current_user_has_village_role(uuid, text[]) from public;
revoke all on function public.current_user_can_view_village(uuid) from public;
revoke all on function public.current_user_can_edit_village(uuid) from public;
revoke all on function public.current_user_can_admin_village(uuid) from public;
revoke all on function public.current_user_can_view_village_slug(text) from public;
revoke all on function public.current_user_can_edit_village_slug(text) from public;
revoke all on function public.current_user_can_admin_village_slug(text) from public;
revoke all on function public.current_user_can_view_program(uuid) from public;
revoke all on function public.current_user_can_edit_program(uuid) from public;
revoke all on function public.current_user_can_view_application(uuid) from public;
revoke all on function public.current_user_can_edit_application(uuid) from public;

grant execute on function public.current_user_profile_emails() to authenticated;
grant execute on function public.current_user_has_village_role(uuid, text[]) to authenticated;
grant execute on function public.current_user_can_view_village(uuid) to authenticated;
grant execute on function public.current_user_can_edit_village(uuid) to authenticated;
grant execute on function public.current_user_can_admin_village(uuid) to authenticated;
grant execute on function public.current_user_can_view_village_slug(text) to authenticated;
grant execute on function public.current_user_can_edit_village_slug(text) to authenticated;
grant execute on function public.current_user_can_admin_village_slug(text) to authenticated;
grant execute on function public.current_user_can_view_program(uuid) to anon, authenticated;
grant execute on function public.current_user_can_edit_program(uuid) to authenticated;
grant execute on function public.current_user_can_view_application(uuid) to authenticated;
grant execute on function public.current_user_can_edit_application(uuid) to authenticated;

alter table public.programs enable row level security;
alter table public.villages enable row level security;
alter table public.program_application_forms enable row level security;
alter table public.program_applications enable row level security;
alter table public.application_status_events enable row level security;
alter table public.participant_documents enable row level security;
alter table public.message_templates enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.program_inquiries enable row level security;
alter table public.village_media_contents enable row level security;
alter table public.host_social_connections enable row level security;
alter table public.report_exports enable row level security;

-- Programs: public sees only published rows; hosts see/manage their own village rows.
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
  created_by = (select auth.uid())
  or (
    village_id is not null
    and public.current_user_can_view_village(village_id)
  )
);

drop policy if exists "Host members can manage own programs" on public.programs;
create policy "Host members can manage own programs"
on public.programs for all
to authenticated
using (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
)
with check (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
);

-- Villages: published pages are public, assigned hosts can read/edit their workspaces.
drop policy if exists "Host members can read own villages" on public.villages;
create policy "Host members can read own villages"
on public.villages for select
to authenticated
using (public.current_user_can_view_village(id));

drop policy if exists "Host members can edit own villages" on public.villages;
create policy "Host members can edit own villages"
on public.villages for update
to authenticated
using (public.current_user_can_edit_village(id))
with check (public.current_user_can_edit_village(id));

-- Application forms: public can read only forms attached to published programs.
drop policy if exists "Public can read published program application forms"
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
  created_by = (select auth.uid())
  or (
    program_id is not null
    and public.current_user_can_view_program(program_id)
  )
);

drop policy if exists "Host members can manage own application forms"
  on public.program_application_forms;
create policy "Host members can manage own application forms"
on public.program_application_forms for all
to authenticated
using (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);

-- Applications and related operational records are never public.
drop policy if exists "Applicants can read own applications" on public.program_applications;
create policy "Applicants can read own applications"
on public.program_applications for select
to authenticated
using (lower(email) = any(public.current_user_profile_emails()));

drop policy if exists "Host members can read own program applications"
  on public.program_applications;
create policy "Host members can read own program applications"
on public.program_applications for select
to authenticated
using (public.current_user_can_view_application(id));

drop policy if exists "Host members can manage own program applications"
  on public.program_applications;
create policy "Host members can manage own program applications"
on public.program_applications for update
to authenticated
using (public.current_user_can_edit_application(id))
with check (public.current_user_can_edit_application(id));

drop policy if exists "Hosts can read owned application status events"
  on public.application_status_events;
create policy "Hosts can read owned application status events"
on public.application_status_events for select
to authenticated
using (public.current_user_can_view_application(application_id));

drop policy if exists "Hosts can create owned application status events"
  on public.application_status_events;
create policy "Hosts can create owned application status events"
on public.application_status_events for insert
to authenticated
with check (public.current_user_can_edit_application(application_id));

drop policy if exists "Hosts can manage owned participant documents"
  on public.participant_documents;
create policy "Hosts can manage owned participant documents"
on public.participant_documents for all
to authenticated
using (public.current_user_can_edit_application(application_id))
with check (public.current_user_can_edit_application(application_id));

drop policy if exists "Applicants can read own participant documents"
  on public.participant_documents;
create policy "Applicants can read own participant documents"
on public.participant_documents for select
to authenticated
using (public.current_user_can_view_application(application_id));

-- Reviews remain public only after publication. Hosts can manage reviews for their village.
drop policy if exists "Host members can manage own village reviews" on public.reviews;
create policy "Host members can manage own village reviews"
on public.reviews for all
to authenticated
using (
  public.is_admin()
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or user_id = (select auth.uid())
);

-- Public inquiries are accepted through server APIs; direct table access is host/user scoped.
drop policy if exists "Users can read own inquiries" on public.program_inquiries;
create policy "Users can read own inquiries"
on public.program_inquiries for select
to authenticated
using (
  submitted_by = (select auth.uid())
  or lower(contact_email) = any(public.current_user_profile_emails())
);

drop policy if exists "Users can create own inquiries" on public.program_inquiries;
create policy "Users can create own inquiries"
on public.program_inquiries for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  or lower(contact_email) = any(public.current_user_profile_emails())
);

drop policy if exists "Host members can manage own inquiries" on public.program_inquiries;
create policy "Host members can manage own inquiries"
on public.program_inquiries for all
to authenticated
using (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);

-- Village media: public sees only published media; hosts can manage their own village.
drop policy if exists "Public can read published village media"
  on public.village_media_contents;
create policy "Public can read published village media"
on public.village_media_contents for select
to anon, authenticated
using (published_at is not null);

drop policy if exists "Host members can manage own village media"
  on public.village_media_contents;
create policy "Host members can manage own village media"
on public.village_media_contents for all
to authenticated
using (
  public.is_admin()
  or public.current_user_can_edit_village_slug(village_slug)
)
with check (
  public.is_admin()
  or public.current_user_can_edit_village_slug(village_slug)
);

-- Social connections contain tokens and are owner/manager only.
drop policy if exists "Host owners can read own social connections"
  on public.host_social_connections;
create policy "Host owners can read own social connections"
on public.host_social_connections for select
to authenticated
using (
  public.is_admin()
  or public.current_user_can_admin_village_slug(village_slug)
);

drop policy if exists "Host owners can manage own social connections"
  on public.host_social_connections;
create policy "Host owners can manage own social connections"
on public.host_social_connections for all
to authenticated
using (
  public.is_admin()
  or public.current_user_can_admin_village_slug(village_slug)
)
with check (
  public.is_admin()
  or public.current_user_can_admin_village_slug(village_slug)
);

-- Host messaging/reporting records are account-owned or application-owned.
drop policy if exists "Host members can manage program message templates"
  on public.message_templates;
create policy "Host members can manage program message templates"
on public.message_templates for all
to authenticated
using (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or created_by = (select auth.uid())
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);

drop policy if exists "Host members can manage scheduled messages"
  on public.scheduled_messages;
create policy "Host members can manage scheduled messages"
on public.scheduled_messages for all
to authenticated
using (
  public.is_admin()
  or (
    application_id is not null
    and public.current_user_can_edit_application(application_id)
  )
)
with check (
  public.is_admin()
  or (
    application_id is not null
    and public.current_user_can_edit_application(application_id)
  )
);

drop policy if exists "Users can read own report exports" on public.report_exports;
create policy "Users can read own report exports"
on public.report_exports for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.report_projects project
    where project.id = report_project_id
      and project.created_by = (select auth.uid())
  )
);

drop policy if exists "Users can manage own report exports" on public.report_exports;
create policy "Users can manage own report exports"
on public.report_exports for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.report_projects project
    where project.id = report_project_id
      and project.created_by = (select auth.uid())
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.report_projects project
    where project.id = report_project_id
      and project.created_by = (select auth.uid())
  )
);

-- Privilege hygiene for Supabase API roles. RLS remains the final boundary.
revoke all on table public.host_social_connections from anon, authenticated;
revoke all on table public.program_inquiries from anon, authenticated;
revoke all on table public.village_media_contents from anon, authenticated;
revoke all on table public.program_applications from anon, authenticated;
revoke all on table public.application_status_events from anon, authenticated;
revoke all on table public.participant_documents from anon, authenticated;
revoke all on table public.scheduled_messages from anon, authenticated;
revoke all on table public.report_exports from anon, authenticated;

grant select on table public.programs to anon, authenticated;
grant select on table public.villages to anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant select on table public.homepage_hero_slides to anon, authenticated;
grant select on table public.village_page_sections to anon, authenticated;
grant select on table public.village_assets to anon, authenticated;
grant select on table public.village_media_contents to anon, authenticated;
grant select on table public.program_application_forms to anon, authenticated;

grant select, insert, update, delete on table public.programs to authenticated;
grant select, update on table public.villages to authenticated;
grant select, insert, update, delete on table public.program_application_forms to authenticated;
grant select, insert, update, delete on table public.program_applications to authenticated;
grant select, insert, update, delete on table public.application_status_events to authenticated;
grant select, insert, update, delete on table public.participant_documents to authenticated;
grant select, insert, update, delete on table public.reviews to authenticated;
grant select, insert, update, delete on table public.program_inquiries to authenticated;
grant select, insert, update, delete on table public.village_media_contents to authenticated;
grant select, insert, update, delete on table public.host_social_connections to authenticated;
grant select, insert, update, delete on table public.message_templates to authenticated;
grant select, insert, update, delete on table public.scheduled_messages to authenticated;
grant select, insert, update, delete on table public.message_campaigns to authenticated;
grant select, insert, update, delete on table public.report_projects to authenticated;
grant select, insert, update, delete on table public.report_exports to authenticated;
