-- The content-hash migration replaced this trigger function without restoring
-- the transaction-local authorization consumed by the immutable audit guard.
-- As a result, every review INSERT failed while creating version 1.
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
      'programId', new.program_id,
      'contentHash', public.review_moderation_content_hash(
        new.title,
        new.excerpt,
        new.body,
        new.images
      )
    ),
    now()
  );

  return new;
end;
$$;

revoke all privileges on function public.record_review_content_version_from_review()
from anon, authenticated, public;
