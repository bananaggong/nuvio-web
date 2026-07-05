-- Consume review content-version audit bypass flags immediately so the
-- immutable snapshot ledger cannot be reused within the same transaction.
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

revoke all privileges on function public.prevent_review_content_version_mutation() from anon, authenticated, public;