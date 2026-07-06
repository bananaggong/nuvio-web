create or replace function public.prevent_unauthorized_review_deleted_restore()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status::text = 'deleted'
    and new.status::text <> 'deleted'
  then
    if current_setting('app.review_restore_deleted_allowed', true) = 'true' then
      perform set_config('app.review_restore_deleted_allowed', '', true);
      return new;
    end if;

    raise exception 'Deleted reviews require explicit restore authorization.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_unauthorized_review_deleted_restore() from anon, authenticated, public;

drop trigger if exists reviews_prevent_unauthorized_deleted_restore on public.reviews;
create trigger reviews_prevent_unauthorized_deleted_restore
before update of status
on public.reviews
for each row
execute function public.prevent_unauthorized_review_deleted_restore();