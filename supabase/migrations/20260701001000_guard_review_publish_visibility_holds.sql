create or replace function public.prevent_review_publish_with_active_hold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
    and exists (
      select 1
      from public.review_visibility_holds hold
      where hold.review_id = new.id
        and hold.status = 'active'
    )
  then
    raise exception 'Active review visibility holds must be released before publishing.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_review_publish_with_active_hold() from public;

drop trigger if exists reviews_prevent_publish_with_active_hold on public.reviews;
create trigger reviews_prevent_publish_with_active_hold
before insert or update of status
on public.reviews
for each row
execute function public.prevent_review_publish_with_active_hold();