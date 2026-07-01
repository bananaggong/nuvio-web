drop policy if exists "Host members can manage own village reviews" on public.reviews;
drop policy if exists "Host members can read own village reviews" on public.reviews;
drop policy if exists "Host members can create own host reviews" on public.reviews;
drop policy if exists "Host members can update own host reviews" on public.reviews;

create policy "Host members can read own village reviews"
on public.reviews for select
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
);

create policy "Host members can create own host reviews"
on public.reviews for insert
to authenticated
with check (
  public.is_admin()
  or (
    source in ('host', 'imported')
    and application_id is null
    and (
      (
        village_slug is not null
        and public.current_user_can_edit_village_slug(village_slug)
      )
      or (
        program_id is not null
        and public.current_user_can_edit_program(program_id)
      )
    )
  )
);

create policy "Host members can update own host reviews"
on public.reviews for update
to authenticated
using (
  public.is_admin()
  or (
    source in ('host', 'imported')
    and application_id is null
    and (
      (
        village_slug is not null
        and public.current_user_can_edit_village_slug(village_slug)
      )
      or (
        program_id is not null
        and public.current_user_can_edit_program(program_id)
      )
    )
  )
)
with check (
  public.is_admin()
  or (
    source in ('host', 'imported')
    and application_id is null
    and (
      (
        village_slug is not null
        and public.current_user_can_edit_village_slug(village_slug)
      )
      or (
        program_id is not null
        and public.current_user_can_edit_program(program_id)
      )
    )
  )
);
