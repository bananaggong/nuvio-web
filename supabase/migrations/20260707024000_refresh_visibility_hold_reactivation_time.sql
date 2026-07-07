-- A released hold can become active again when the same moderation/report
-- source becomes unsafe again. Treat that as a new hold window so host queues
-- and age-based operations sort by the latest reactivation, not the original
-- first hold timestamp.
with latest_reactivation as (
  select
    event.hold_id,
    max(event.created_at) as reactivated_at
  from public.review_visibility_hold_events event
  where event.action = 'reactivated'
  group by event.hold_id
)
update public.review_visibility_holds hold
set
  held_at = latest.reactivated_at,
  updated_at = greatest(hold.updated_at, latest.reactivated_at)
from latest_reactivation latest
where hold.id = latest.hold_id
  and hold.status = 'active'
  and hold.held_at < latest.reactivated_at;

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
declare
  activation_time timestamptz := now();
begin
  if hold_source_id is null then
    perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

    update public.review_visibility_holds
    set
      status = 'active',
      released_at = null,
      held_at = case
        when status = 'released' then activation_time
        else held_at
      end,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = activation_time
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
      held_at = case
        when status = 'released' then activation_time
        else held_at
      end,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = activation_time
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
    activation_time,
    activation_time
  );
end;
$$;

revoke all privileges on function public.activate_review_visibility_hold(uuid, text, uuid, text, jsonb)
from anon, authenticated, public;
