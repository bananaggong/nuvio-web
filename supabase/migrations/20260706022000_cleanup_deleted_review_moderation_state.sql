-- When a review is removed from the operating surface, outstanding moderation
-- artifacts should stop contributing to host queues. This mirrors common review
-- platform behavior: deleting/removing the content closes related reports and
-- releases visibility holds tied to that content.
create or replace function public.cleanup_review_moderation_state_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cleanup_time timestamptz := now();
begin
  if new.status::text <> 'deleted'
    or (tg_op = 'UPDATE' and old.status::text = 'deleted')
  then
    return new;
  end if;

  update public.review_reports report
  set
    status = 'dismissed',
    resolution_note = left(
      coalesce(
        nullif(btrim(report.resolution_note), ''),
        'Dismissed automatically because the review was deleted.'
      ),
      1000
    ),
    resolved_at = coalesce(report.resolved_at, cleanup_time),
    updated_at = cleanup_time
  where report.review_id = new.id
    and report.status in ('open', 'reviewing');

  perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

  update public.review_visibility_holds hold
  set
    status = 'released',
    released_at = coalesce(hold.released_at, cleanup_time),
    metadata = jsonb_set(
      coalesce(hold.metadata, '{}'::jsonb),
      '{release}',
      jsonb_build_object(
        'source', 'review_deleted',
        'releasedAt', coalesce(hold.released_at, cleanup_time)::text
      ),
      true
    ),
    updated_at = cleanup_time
  where hold.review_id = new.id
    and hold.status = 'active';

  return new;
end;
$$;

revoke all privileges on function public.cleanup_review_moderation_state_after_delete()
from anon, authenticated, public;

drop trigger if exists reviews_cleanup_moderation_state_after_delete
on public.reviews;
create trigger reviews_cleanup_moderation_state_after_delete
after insert or update of status
on public.reviews
for each row
execute function public.cleanup_review_moderation_state_after_delete();

update public.review_reports report
set
  status = 'dismissed',
  resolution_note = left(
    coalesce(
      nullif(btrim(report.resolution_note), ''),
      'Dismissed automatically because the review was deleted.'
    ),
    1000
  ),
  resolved_at = coalesce(report.resolved_at, now()),
  updated_at = now()
from public.reviews review
where review.id = report.review_id
  and review.status = 'deleted'
  and report.status in ('open', 'reviewing');

do $$
declare
  hold_row record;
  release_time timestamptz;
begin
  for hold_row in
    select hold.id, hold.released_at
    from public.review_visibility_holds hold
    inner join public.reviews review on review.id = hold.review_id
    where review.status = 'deleted'
      and hold.status = 'active'
  loop
    release_time := now();
    perform set_config('app.review_visibility_hold_write_allowed', 'true', true);

    update public.review_visibility_holds hold
    set
      status = 'released',
      released_at = coalesce(hold.released_at, release_time),
      metadata = jsonb_set(
        coalesce(hold.metadata, '{}'::jsonb),
        '{release}',
        jsonb_build_object(
          'source', 'review_deleted_backfill',
          'releasedAt', coalesce(hold.released_at, release_time)::text
        ),
        true
      ),
      updated_at = release_time
    where hold.id = hold_row.id;
  end loop;
end $$;
