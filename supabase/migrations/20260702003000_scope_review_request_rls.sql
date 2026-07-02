drop policy if exists "Host members can manage review requests" on public.review_requests;
drop policy if exists "Host members can read review requests" on public.review_requests;
drop policy if exists "Host members can create review requests" on public.review_requests;
drop policy if exists "Host members can update review requests" on public.review_requests;

create policy "Host members can read review requests"
on public.review_requests for select
to authenticated
using (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
);

create policy "Host members can create review requests"
on public.review_requests for insert
to authenticated
with check (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
);

create policy "Host members can update review requests"
on public.review_requests for update
to authenticated
using (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
)
with check (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
);

revoke delete on table public.review_requests from authenticated;