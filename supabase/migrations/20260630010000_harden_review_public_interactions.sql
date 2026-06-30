delete from public.review_helpful_votes vote
using public.reviews review
where review.id = vote.review_id
  and review.user_id is not null
  and review.user_id = vote.user_id;

update public.review_reports report
set status = 'dismissed',
    resolution_note = coalesce(nullif(report.resolution_note, ''), 'Dismissed automatically because reporter owns the review.'),
    resolved_at = coalesce(report.resolved_at, now()),
    updated_at = now()
from public.reviews review
where review.id = report.review_id
  and review.user_id is not null
  and report.reporter_id = review.user_id
  and report.status in ('open', 'reviewing');

create or replace function public.prevent_invalid_review_helpful_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.review_is_publicly_visible(new.review_id) is not true then
    raise exception 'Helpful votes are only allowed on publicly visible reviews.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.reviews review
    where review.id = new.review_id
      and review.user_id is not null
      and review.user_id = new.user_id
  ) then
    raise exception 'Users cannot mark their own reviews as helpful.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_invalid_review_helpful_vote() from public;

drop trigger if exists review_helpful_votes_prevent_invalid_vote on public.review_helpful_votes;
create trigger review_helpful_votes_prevent_invalid_vote
before insert or update of review_id, user_id
on public.review_helpful_votes
for each row
execute function public.prevent_invalid_review_helpful_vote();

create or replace function public.prevent_invalid_review_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.review_is_publicly_visible(new.review_id) is not true then
    raise exception 'Reports are only allowed on publicly visible reviews.'
      using errcode = '23514';
  end if;

  if new.reporter_id is not null and exists (
    select 1
    from public.reviews review
    where review.id = new.review_id
      and review.user_id is not null
      and review.user_id = new.reporter_id
  ) then
    raise exception 'Users cannot report their own reviews.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_invalid_review_report() from public;

drop trigger if exists review_reports_prevent_invalid_report on public.review_reports;
create trigger review_reports_prevent_invalid_report
before insert or update of review_id, reporter_id
on public.review_reports
for each row
execute function public.prevent_invalid_review_report();

drop policy if exists "Users can manage own review helpful votes" on public.review_helpful_votes;
create policy "Users can manage own review helpful votes"
on public.review_helpful_votes for all
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and public.review_is_publicly_visible(review.id)
      and (review.user_id is null or review.user_id <> (select auth.uid()))
  )
);

drop policy if exists "Users can create review reports" on public.review_reports;
create policy "Users can create review reports"
on public.review_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and public.review_is_publicly_visible(review_id)
  and exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (review.user_id is null or review.user_id <> (select auth.uid()))
  )
);
