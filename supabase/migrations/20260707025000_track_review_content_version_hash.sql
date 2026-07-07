-- Tie every immutable content-version snapshot to the same content hash used
-- by moderation checks. This makes it possible to prove which exact review
-- text/images were moderated without relying on mutable current review fields.
drop trigger if exists review_content_versions_prevent_mutation
on public.review_content_versions;

update public.review_content_versions version
set metadata = jsonb_set(
  coalesce(version.metadata, '{}'::jsonb),
  '{contentHash}',
  to_jsonb(
    public.review_moderation_content_hash(
      version.title,
      version.excerpt,
      version.body,
      version.images
    )
  ),
  true
)
where version.metadata ->> 'contentHash' is distinct from
  public.review_moderation_content_hash(
    version.title,
    version.excerpt,
    version.body,
    version.images
  );

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

alter table public.review_content_versions
  drop constraint if exists review_content_versions_content_hash_metadata_chk;

alter table public.review_content_versions
  add constraint review_content_versions_content_hash_metadata_chk
  check (
    metadata ->> 'contentHash' =
      public.review_moderation_content_hash(title, excerpt, body, images)
  );

create trigger review_content_versions_prevent_mutation
before insert or update or delete
on public.review_content_versions
for each row
execute function public.prevent_review_content_version_mutation();
