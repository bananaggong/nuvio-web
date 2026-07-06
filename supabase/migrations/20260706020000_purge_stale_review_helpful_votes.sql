-- Helpful votes should only exist for reviews that are currently eligible for
-- public interaction. If a review loses public visibility later, remove stale
-- votes so stored counters cannot drift from the visible review surface.
create or replace function public.purge_review_helpful_votes_if_not_public(
  review_uuid uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer := 0;
begin
  if review_uuid is null then
    return 0;
  end if;

  if public.review_is_publicly_visible(review_uuid) is true then
    return 0;
  end if;

  delete from public.review_helpful_votes vote
  where vote.review_id = review_uuid;

  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all privileges on function public.purge_review_helpful_votes_if_not_public(uuid)
from anon, authenticated, public;

create or replace function public.purge_review_helpful_votes_after_review_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.purge_review_helpful_votes_if_not_public(new.id);
  return new;
end;
$$;

revoke all privileges on function public.purge_review_helpful_votes_after_review_visibility_change()
from anon, authenticated, public;

drop trigger if exists reviews_purge_stale_helpful_votes on public.reviews;
create trigger reviews_purge_stale_helpful_votes
after insert or update of status, published_at, program_id
on public.reviews
for each row
execute function public.purge_review_helpful_votes_after_review_visibility_change();

create or replace function public.purge_review_helpful_votes_after_hold_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    perform public.purge_review_helpful_votes_if_not_public(new.review_id);
  end if;

  return new;
end;
$$;

revoke all privileges on function public.purge_review_helpful_votes_after_hold_activation()
from anon, authenticated, public;

drop trigger if exists review_visibility_holds_purge_stale_helpful_votes
on public.review_visibility_holds;
create trigger review_visibility_holds_purge_stale_helpful_votes
after insert or update of status
on public.review_visibility_holds
for each row
execute function public.purge_review_helpful_votes_after_hold_activation();

create or replace function public.purge_review_helpful_votes_after_program_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.published_at is not null then
    return new;
  end if;

  delete from public.review_helpful_votes vote
  using public.reviews review
  where review.id = vote.review_id
    and review.program_id = new.id
    and public.review_is_publicly_visible(review.id) is not true;

  return new;
end;
$$;

revoke all privileges on function public.purge_review_helpful_votes_after_program_visibility_change()
from anon, authenticated, public;

drop trigger if exists programs_purge_stale_review_helpful_votes
on public.programs;
create trigger programs_purge_stale_review_helpful_votes
after update of published_at
on public.programs
for each row
execute function public.purge_review_helpful_votes_after_program_visibility_change();

delete from public.review_helpful_votes vote
where public.review_is_publicly_visible(vote.review_id) is not true;
