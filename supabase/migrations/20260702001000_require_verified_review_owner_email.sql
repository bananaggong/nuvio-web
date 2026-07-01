create or replace function public.current_user_verified_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(value), '{}'::text[])
  from (
    select lower(nullif(btrim(email), '')) as value
    from auth.users
    where id = (select auth.uid())
      and email is not null
      and email_confirmed_at is not null
  ) emails
  where value is not null;
$$;

revoke all on function public.current_user_verified_emails() from public;
grant execute on function public.current_user_verified_emails() to authenticated;

create or replace function public.current_user_can_review_application(application_uuid uuid)
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
      and application.status in ('accepted', 'checkedIn', 'completed')
      and (
        application.submitted_by = (select auth.uid())
        or lower(application.email) = any(public.current_user_verified_emails())
      )
  );
$$;

revoke all on function public.current_user_can_review_application(uuid) from public;
grant execute on function public.current_user_can_review_application(uuid) to authenticated;

create or replace function public.current_user_owns_application(application_uuid uuid)
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
      and (
        application.submitted_by = (select auth.uid())
        or lower(application.email) = any(public.current_user_verified_emails())
      )
  );
$$;

revoke all on function public.current_user_owns_application(uuid) from public;
grant execute on function public.current_user_owns_application(uuid) to authenticated;
