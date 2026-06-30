create or replace function public.prevent_unauthorized_review_deleted_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text = 'deleted'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    if current_setting('app.review_delete_allowed', true) = 'true' then
      return new;
    end if;

    if (select auth.uid()) is not null then
      if public.is_admin() then
        return new;
      end if;

      if new.user_id = (select auth.uid()) then
        return new;
      end if;
    end if;

    raise exception 'Deleted review status requires explicit delete authorization.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unauthorized_review_deleted_status() from public;

drop trigger if exists reviews_prevent_unauthorized_deleted_status on public.reviews;
create trigger reviews_prevent_unauthorized_deleted_status
before insert or update of status
on public.reviews
for each row
execute function public.prevent_unauthorized_review_deleted_status();