-- Anonymous or system-triggered review audit events may be enriched without an
-- actor id. Treat actor_role or enrichedBy metadata as finalization markers
-- across non-reply review audit event ledgers.

create or replace function public.prevent_review_status_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review status events can only be created by review write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review status events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review status events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null
    or old.actor_role is not null
    or old.metadata ? 'enrichedBy'
  then
    raise exception 'Review status event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review status event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all privileges on function public.prevent_review_status_event_mutation()
from anon, authenticated, public;

create or replace function public.prevent_review_report_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review report events can only be created by report write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review report events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review report events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null
    or old.actor_role is not null
    or old.metadata ? 'enrichedBy'
  then
    raise exception 'Review report event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.report_id is distinct from old.report_id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.reason is distinct from old.reason
    or new.message is distinct from old.message
    or new.resolution_note is distinct from old.resolution_note
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review report event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all privileges on function public.prevent_review_report_event_mutation()
from anon, authenticated, public;

create or replace function public.prevent_review_visibility_hold_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review visibility hold events can only be created by hold write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review visibility hold events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review visibility hold events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null
    or old.actor_role is not null
    or old.metadata ? 'enrichedBy'
  then
    raise exception 'Review visibility hold event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.hold_id is distinct from old.hold_id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
    or new.reason is distinct from old.reason
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review visibility hold event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all privileges on function public.prevent_review_visibility_hold_event_mutation()
from anon, authenticated, public;

create or replace function public.prevent_review_helpful_vote_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review helpful vote events can only be created by vote write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review helpful vote events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review helpful vote events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null
    or old.actor_role is not null
    or old.metadata ? 'enrichedBy'
  then
    raise exception 'Review helpful vote event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.user_id is distinct from old.user_id
    or new.action is distinct from old.action
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review helpful vote event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all privileges on function public.prevent_review_helpful_vote_event_mutation()
from anon, authenticated, public;
