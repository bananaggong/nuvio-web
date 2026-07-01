create or replace function public.record_review_content_version_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  if tg_op = 'UPDATE' then
    if old.title is not distinct from new.title
      and old.category is not distinct from new.category
      and old.author_name is not distinct from new.author_name
      and old.excerpt is not distinct from new.excerpt
      and old.body is not distinct from new.body
      and old.images is not distinct from new.images
      and old.rating is not distinct from new.rating
      and old.source is not distinct from new.source
    then
      return new;
    end if;
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);
  perform pg_advisory_xact_lock(hashtext('review-content-version:' || new.id::text));

  select coalesce(max(version), 0) + 1
  into next_version
  from public.review_content_versions
  where review_id = new.id;

  insert into public.review_content_versions (
    review_id,
    version,
    title,
    category,
    author_name,
    excerpt,
    body,
    images,
    rating,
    source,
    status,
    change_source,
    changed_by,
    metadata,
    created_at
  ) values (
    new.id,
    next_version,
    new.title,
    new.category,
    new.author_name,
    new.excerpt,
    new.body,
    new.images,
    new.rating,
    new.source,
    new.status,
    'database_trigger',
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'reviewSource', new.source,
      'applicationId', new.application_id,
      'programId', new.program_id
    ),
    now()
  );

  return new;
end;
$$;

create or replace function public.record_review_status_event_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.review_audit_insert_allowed', 'true', true);

  if tg_op = 'INSERT' then
    insert into public.review_status_events (
      review_id,
      from_status,
      to_status,
      action,
      actor_id,
      reason,
      note,
      metadata
    ) values (
      new.id,
      null,
      new.status,
      public.review_status_event_action(null, new.status),
      (select auth.uid()),
      coalesce(new.hidden_reason, new.moderation_note),
      new.moderation_note,
      jsonb_build_object(
        'source', 'database_trigger',
        'reviewSource', new.source,
        'applicationId', new.application_id,
        'programId', new.program_id
      )
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.review_status_events (
      review_id,
      from_status,
      to_status,
      action,
      actor_id,
      reason,
      note,
      metadata
    ) values (
      new.id,
      old.status,
      new.status,
      public.review_status_event_action(old.status, new.status),
      (select auth.uid()),
      coalesce(new.hidden_reason, new.moderation_note),
      new.moderation_note,
      jsonb_build_object(
        'source', 'database_trigger',
        'reviewSource', new.source,
        'applicationId', new.application_id,
        'programId', new.program_id
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.record_review_host_reply_event_from_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  body_changed boolean := false;
  author_changed boolean := false;
  previous_status text;
begin
  if tg_op = 'UPDATE' then
    body_changed := old.body is distinct from new.body;
    author_changed := old.author_name is distinct from new.author_name;
    if old.status is not distinct from new.status
      and not body_changed
      and not author_changed
    then
      return new;
    end if;
    previous_status := old.status;
  else
    previous_status := null;
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_host_reply_events (
    reply_id,
    review_id,
    from_status,
    to_status,
    action,
    actor_id,
    author_name,
    body,
    metadata,
    created_at
  ) values (
    new.id,
    new.review_id,
    previous_status,
    new.status,
    public.review_host_reply_event_action(previous_status, new.status, body_changed, author_changed),
    (select auth.uid()),
    new.author_name,
    new.body,
    jsonb_build_object(
      'source', 'database_trigger',
      'bodyChanged', body_changed,
      'authorChanged', author_changed
    ),
    now()
  );

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
    return new;
  end if;

  if tg_op = 'DELETE' then
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
    return new;
  end if;

  if tg_op = 'DELETE' then
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
    return new;
  end if;

  if tg_op = 'DELETE' then
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

  return new;
end;
$$;

revoke all on function public.prevent_review_content_version_mutation() from public;
revoke all on function public.prevent_review_status_event_mutation() from public;
revoke all on function public.prevent_review_host_reply_event_mutation() from public;

drop trigger if exists review_content_versions_prevent_mutation on public.review_content_versions;
create trigger review_content_versions_prevent_mutation
before insert or update or delete
on public.review_content_versions
for each row
execute function public.prevent_review_content_version_mutation();

drop trigger if exists review_status_events_prevent_mutation on public.review_status_events;
create trigger review_status_events_prevent_mutation
before insert or update or delete
on public.review_status_events
for each row
execute function public.prevent_review_status_event_mutation();

drop trigger if exists review_host_reply_events_prevent_mutation on public.review_host_reply_events;
create trigger review_host_reply_events_prevent_mutation
before insert or update or delete
on public.review_host_reply_events
for each row
execute function public.prevent_review_host_reply_event_mutation();