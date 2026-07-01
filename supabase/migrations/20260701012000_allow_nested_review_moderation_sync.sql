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

revoke all on function public.prevent_review_moderation_check_mutation() from public;
