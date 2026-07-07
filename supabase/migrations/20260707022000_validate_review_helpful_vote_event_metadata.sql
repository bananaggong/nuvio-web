update public.review_helpful_vote_events
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{helpful}',
  to_jsonb(action = 'added'),
  true
)
where action in ('added', 'removed')
  and (
    jsonb_typeof(metadata->'helpful') is distinct from 'boolean'
    or (action = 'added' and metadata->>'helpful' <> 'true')
    or (action = 'removed' and metadata->>'helpful' <> 'false')
  );

create or replace function public.record_review_helpful_vote_event_from_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_review_id uuid;
  target_user_id uuid;
  target_action text;
begin
  if tg_op = 'DELETE' then
    target_review_id := old.review_id;
    target_user_id := old.user_id;
    target_action := 'removed';
  else
    target_review_id := new.review_id;
    target_user_id := new.user_id;
    target_action := 'added';
  end if;

  perform set_config('app.review_audit_insert_allowed', 'true', true);

  insert into public.review_helpful_vote_events (
    review_id,
    user_id,
    action,
    actor_id,
    metadata,
    created_at
  ) values (
    target_review_id,
    target_user_id,
    target_action,
    (select auth.uid()),
    jsonb_build_object(
      'source', 'database_trigger',
      'reviewId', target_review_id,
      'userId', target_user_id,
      'action', target_action,
      'helpful', target_action = 'added'
    ),
    now()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.record_review_helpful_vote_event_from_vote()
from anon, authenticated, public;

alter table public.review_helpful_vote_events
  drop constraint if exists review_helpful_vote_events_helpful_metadata_chk;

alter table public.review_helpful_vote_events
  add constraint review_helpful_vote_events_helpful_metadata_chk
  check (
    (
      action = 'added'
      and jsonb_typeof(metadata->'helpful') = 'boolean'
      and metadata->>'helpful' = 'true'
    )
    or (
      action = 'removed'
      and jsonb_typeof(metadata->'helpful') = 'boolean'
      and metadata->>'helpful' = 'false'
    )
  );
