-- Token-based review request flows can enrich audit events without an actor id.
-- Treat any prior application enrichment metadata as final so anonymous events
-- cannot be enriched repeatedly.
create or replace function public.prevent_review_request_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review request events can only be created by request write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review request events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review request events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null
    or old.actor_role is not null
    or old.metadata ? 'enrichedBy'
  then
    raise exception 'Review request event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.request_id is distinct from old.request_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review request event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all privileges on function public.prevent_review_request_event_mutation()
from anon, authenticated, public;
