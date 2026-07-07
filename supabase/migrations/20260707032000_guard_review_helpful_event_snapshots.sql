-- Helpful-vote audit events are append-only evidence of user interaction.
-- Keep duplicated metadata aligned with the immutable event columns, and ensure
-- a user-scoped event cannot be attributed to a different actor.
update public.review_helpful_vote_events
set metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{reviewId}',
      to_jsonb(review_id::text),
      true
    ),
    '{userId}',
    to_jsonb(user_id::text),
    true
  ),
  '{action}',
  to_jsonb(action),
  true
)
where metadata ->> 'reviewId' is distinct from review_id::text
  or metadata ->> 'userId' is distinct from user_id::text
  or metadata ->> 'action' is distinct from action;

alter table public.review_helpful_vote_events
  drop constraint if exists review_helpful_vote_events_snapshot_metadata_chk;

alter table public.review_helpful_vote_events
  add constraint review_helpful_vote_events_snapshot_metadata_chk
  check (
    metadata ->> 'reviewId' = review_id::text
    and metadata ->> 'userId' = user_id::text
    and metadata ->> 'action' = action
  );

alter table public.review_helpful_vote_events
  drop constraint if exists review_helpful_vote_events_actor_user_chk;

alter table public.review_helpful_vote_events
  add constraint review_helpful_vote_events_actor_user_chk
  check (actor_id is null or actor_id = user_id);
