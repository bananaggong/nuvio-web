-- Keep the browser-facing Supabase role on a narrow read-only surface.
-- RLS still decides row visibility; these grants remove unnecessary table-level write access.

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
      'revoke all privileges on table %I.%I from anon',
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
      'revoke all privileges on sequence %I.%I from anon',
      sequence_record.sequence_schema,
      sequence_record.sequence_name
    );
  end loop;
end $$;

grant select on table public.announcements to anon;
grant select on table public.external_announcement_sources to anon;
grant select on table public.external_announcements to anon;
grant select on table public.homepage_hero_slides to anon;
grant select on table public.program_application_forms to anon;
grant select on table public.programs to anon;
grant select on table public.reviews to anon;
grant select on table public.village_assets to anon;
grant select on table public.village_media_contents to anon;
grant select on table public.village_page_sections to anon;
grant select on table public.villages to anon;
