create or replace function public.prevent_review_report_origin_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.reporter_id is distinct from old.reporter_id
    or new.reporter_email is distinct from old.reporter_email
    or new.reason is distinct from old.reason
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise exception 'Review report origin fields are immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_review_report_origin_mutation() from public;

drop trigger if exists review_reports_prevent_origin_mutation on public.review_reports;
create trigger review_reports_prevent_origin_mutation
before update on public.review_reports
for each row
execute function public.prevent_review_report_origin_mutation();

drop policy if exists "Users can create review reports" on public.review_reports;
create policy "Users can create review reports"
on public.review_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and resolved_by is null
  and resolved_at is null
  and resolution_note is null
  and (
    reporter_email is null
    or lower(reporter_email) = any(public.current_user_verified_emails())
  )
  and public.review_is_publicly_visible(review_id)
  and exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (review.user_id is null or review.user_id <> (select auth.uid()))
  )
);

drop policy if exists "Host members can manage own review reports" on public.review_reports;
drop policy if exists "Host members can read own review reports" on public.review_reports;
drop policy if exists "Host members can update own review reports" on public.review_reports;

create policy "Host members can read own review reports"
on public.review_reports for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

create policy "Host members can update own review reports"
on public.review_reports for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);