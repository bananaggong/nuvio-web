create or replace function public.prevent_review_moderation_check_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if current_setting('app.review_moderation_write_allowed', true) is distinct from 'true'
      and pg_trigger_depth() <= 1 then
      raise exception 'Review moderation checks can only be written by review write triggers or the application service.'
        using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.reviews review
      where review.id = new.review_id
        and review.status = 'deleted'
    ) then
      raise exception 'Deleted reviews cannot have moderation checks.'
        using errcode = '23514';
    end if;

    if current_setting('app.review_moderation_write_allowed', true) = 'true' then
      perform set_config('app.review_moderation_write_allowed', '', true);
    end if;

    return new;
  end if;

  if current_setting('app.review_hard_delete_allowed', true) = 'true' then
    return old;
  end if;

  raise exception 'Review moderation checks are system managed and cannot be deleted directly.'
    using errcode = '42501';
end;
$$;

revoke all privileges on function public.prevent_review_moderation_check_mutation()
from anon, authenticated, public;

create or replace function public.purge_review_moderation_check_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text <> 'deleted'
    or (tg_op = 'UPDATE' and old.status::text = 'deleted')
  then
    return new;
  end if;

  perform set_config('app.review_hard_delete_allowed', 'true', true);

  delete from public.review_moderation_checks moderation
  where moderation.review_id = new.id;

  return new;
end;
$$;

revoke all privileges on function public.purge_review_moderation_check_after_delete()
from anon, authenticated, public;

drop trigger if exists reviews_purge_moderation_check_after_delete
on public.reviews;
create trigger reviews_purge_moderation_check_after_delete
after insert or update of status
on public.reviews
for each row
execute function public.purge_review_moderation_check_after_delete();

select set_config('app.review_hard_delete_allowed', 'true', true);

delete from public.review_moderation_checks moderation
using public.reviews review
where review.id = moderation.review_id
  and review.status = 'deleted';
