update public.review_visibility_holds
set
  released_at = null,
  metadata = coalesce(metadata, '{}'::jsonb) - 'release',
  updated_at = now()
where status = 'active'
  and (released_at is not null or metadata ? 'release');

update public.review_visibility_holds
set
  released_at = coalesce(released_at, updated_at, created_at, now()),
  metadata = jsonb_set(
    coalesce(metadata, '{}'::jsonb),
    '{release}',
    coalesce(metadata->'release', '{}'::jsonb)
      || jsonb_build_object(
        'source',
        coalesce(nullif(btrim(metadata #>> '{release,source}'), ''), 'migration_backfill'),
        'releasedAt',
        coalesce(
          nullif(btrim(metadata #>> '{release,releasedAt}'), ''),
          coalesce(released_at, updated_at, created_at, now())::text
        )
      ),
    true
  ),
  updated_at = now()
where status = 'released'
  and (
    released_at is null
    or jsonb_typeof(metadata->'release') is distinct from 'object'
    or nullif(btrim(metadata #>> '{release,source}'), '') is null
    or nullif(btrim(metadata #>> '{release,releasedAt}'), '') is null
  );

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
declare
  release_time timestamptz := now();
begin
  perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

  update public.review_visibility_holds
  set
    status = 'released',
    released_at = coalesce(released_at, release_time),
    metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{release}',
      jsonb_build_object(
        'source', 'database_function',
        'releasedAt', coalesce(released_at, release_time)::text
      ),
      true
    ),
    updated_at = release_time
  where review_id = hold_review_id
    and source_type = hold_source_type
    and (hold_source_id is null and source_id is null or hold_source_id is not null and source_id = hold_source_id)
    and (hold_reason is null or reason = hold_reason)
    and status = 'active';
end;
$$;

revoke all privileges on function public.release_review_visibility_hold(uuid, text, uuid, text) from anon, authenticated, public;

alter table public.review_visibility_holds
  drop constraint if exists review_visibility_holds_release_state_chk,
  add constraint review_visibility_holds_release_state_chk
    check (
      (
        status = 'active'
        and released_at is null
        and not (metadata ? 'release')
      )
      or (
        status = 'released'
        and released_at is not null
        and jsonb_typeof(metadata->'release') = 'object'
        and nullif(btrim(metadata #>> '{release,source}'), '') is not null
        and nullif(btrim(metadata #>> '{release,releasedAt}'), '') is not null
      )
    );
