create or replace function public.activate_review_visibility_hold(
  hold_review_id uuid,
  hold_source_type text,
  hold_source_id uuid,
  hold_reason text,
  hold_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if hold_source_id is null then
    perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

    update public.review_visibility_holds
    set
      status = 'active',
      released_at = null,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = now()
    where review_id = hold_review_id
      and source_type = hold_source_type
      and source_id is null
      and reason = hold_reason;

    if found then
      return;
    end if;
  else
    perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

    update public.review_visibility_holds
    set
      review_id = hold_review_id,
      status = 'active',
      released_at = null,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = now()
    where source_type = hold_source_type
      and source_id = hold_source_id
      and reason = hold_reason;

    if found then
      return;
    end if;
  end if;

  perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

  insert into public.review_visibility_holds (
    review_id,
    source_type,
    source_id,
    reason,
    status,
    metadata,
    held_at,
    updated_at
  ) values (
    hold_review_id,
    hold_source_type,
    hold_source_id,
    hold_reason,
    'active',
    coalesce(hold_metadata, '{}'::jsonb),
    now(),
    now()
  );
end;
$$;

create or replace function public.release_review_visibility_hold(
  hold_review_id uuid,
  hold_source_type text,
  hold_source_id uuid,
  hold_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

  update public.review_visibility_holds
  set
    status = 'released',
    released_at = coalesce(released_at, now()),
    updated_at = now()
  where review_id = hold_review_id
    and source_type = hold_source_type
    and (hold_source_id is null and source_id is null or hold_source_id is not null and source_id = hold_source_id)
    and (hold_reason is null or reason = hold_reason)
    and status = 'active';
end;
$$;

revoke all on function public.activate_review_visibility_hold(uuid, text, uuid, text, jsonb) from public;
revoke all on function public.release_review_visibility_hold(uuid, text, uuid, text) from public;

create or replace function public.prevent_review_visibility_hold_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if current_setting('app.review_visibility_hold_write_allowed', true) is distinct from 'true'
      and pg_trigger_depth() <= 1 then
      raise exception 'Review visibility holds can only be written by hold sync triggers or the application service.'
        using errcode = '42501';
    end if;

    if current_setting('app.review_visibility_hold_write_allowed', true) = 'true' then
      perform set_config('app.review_visibility_hold_write_allowed', '', true);
    end if;

    return new;
  end if;

  if current_setting('app.review_hard_delete_allowed', true) = 'true' then
    return old;
  end if;

  raise exception 'Review visibility holds are system managed and cannot be deleted directly.'
    using errcode = '42501';
end;
$$;

revoke all on function public.prevent_review_visibility_hold_mutation() from public;

drop trigger if exists review_visibility_holds_prevent_hard_delete on public.review_visibility_holds;
drop trigger if exists review_visibility_holds_prevent_mutation on public.review_visibility_holds;
create trigger review_visibility_holds_prevent_mutation
before insert or update or delete
on public.review_visibility_holds
for each row
execute function public.prevent_review_visibility_hold_mutation();

drop policy if exists "Host members can manage review visibility holds" on public.review_visibility_holds;

revoke insert, update, delete on table public.review_visibility_holds from authenticated;
grant select on table public.review_visibility_holds to authenticated;
