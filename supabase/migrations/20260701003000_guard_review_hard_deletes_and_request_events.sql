create or replace function public.prevent_review_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.review_hard_delete_allowed', true) = 'true' then
    return old;
  end if;

  raise exception 'Review domain records are soft-delete only. Hard delete requires explicit maintenance authorization.'
    using errcode = '42501';
end;
$$;

create or replace function public.record_review_request_event_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_request_events (
    request_id,
    from_status,
    to_status,
    action,
    actor_id,
    metadata,
    created_at
  ) values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    public.review_request_event_action(case when tg_op = 'INSERT' then null else old.status end, new.status),
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'applicationId', new.application_id,
      'programId', new.program_id,
      'requestCount', new.request_count
    ),
    now()
  );

  return new;
end;
$$;

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

  if old.actor_id is not null then
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

create or replace function public.prevent_review_content_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review content versions can only be created by review write triggers.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review content versions are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review content versions can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.changed_by is not null then
    raise exception 'Review content version enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.review_id is distinct from old.review_id
    or new.version is distinct from old.version
    or new.title is distinct from old.title
    or new.category is distinct from old.category
    or new.author_name is distinct from old.author_name
    or new.excerpt is distinct from old.excerpt
    or new.body is distinct from old.body
    or new.images is distinct from old.images
    or new.rating is distinct from old.rating
    or new.source is distinct from old.source
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review content version snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

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

  if old.actor_id is not null then
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

create or replace function public.prevent_review_host_reply_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.review_audit_insert_allowed', true) is distinct from 'true' then
      raise exception 'Review host reply events can only be created by reply write triggers or the application service.'
        using errcode = '42501';
    end if;
    perform set_config('app.review_audit_insert_allowed', '', true);
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('app.review_hard_delete_allowed', true) = 'true' then
      return old;
    end if;

    raise exception 'Review host reply events are append-only.'
      using errcode = '42501';
  end if;

  if current_setting('app.review_audit_enrich_allowed', true) is distinct from 'true' then
    raise exception 'Review host reply events can only be enriched by the application service.'
      using errcode = '42501';
  end if;

  if old.actor_id is not null then
    raise exception 'Review host reply event enrichment is already finalized.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.reply_id is distinct from old.reply_id
    or new.review_id is distinct from old.review_id
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.action is distinct from old.action
    or new.author_name is distinct from old.author_name
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review host reply event snapshots cannot be changed.'
      using errcode = '42501';
  end if;

  perform set_config('app.review_audit_enrich_allowed', '', true);
  return new;
end;
$$;

revoke all on function public.prevent_review_hard_delete() from public;
revoke all on function public.prevent_review_request_event_mutation() from public;

drop trigger if exists reviews_prevent_hard_delete on public.reviews;
create trigger reviews_prevent_hard_delete
before delete
on public.reviews
for each row
execute function public.prevent_review_hard_delete();

drop trigger if exists review_host_replies_prevent_hard_delete on public.review_host_replies;
create trigger review_host_replies_prevent_hard_delete
before delete
on public.review_host_replies
for each row
execute function public.prevent_review_hard_delete();

drop trigger if exists review_requests_prevent_hard_delete on public.review_requests;
create trigger review_requests_prevent_hard_delete
before delete
on public.review_requests
for each row
execute function public.prevent_review_hard_delete();

drop trigger if exists review_moderation_checks_prevent_hard_delete on public.review_moderation_checks;
create trigger review_moderation_checks_prevent_hard_delete
before delete
on public.review_moderation_checks
for each row
execute function public.prevent_review_hard_delete();

drop trigger if exists review_request_events_prevent_mutation on public.review_request_events;
create trigger review_request_events_prevent_mutation
before insert or update or delete
on public.review_request_events
for each row
execute function public.prevent_review_request_event_mutation();

revoke delete on table public.reviews from authenticated;
revoke delete on table public.review_host_replies from authenticated;
revoke delete on table public.review_requests from authenticated;
revoke delete on table public.review_moderation_checks from authenticated;