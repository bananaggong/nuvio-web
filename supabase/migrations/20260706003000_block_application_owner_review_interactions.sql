-- Treat a review's application owner as the review owner for public
-- interactions. Token-submitted reviews may not have reviews.user_id, so
-- verified application email and submitted_by must still block self-helpful
-- votes and self-reports.
create or replace function public.review_actor_owns_review(
  review_uuid uuid,
  actor_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select actor_uuid is not null
    and exists (
      select 1
      from public.reviews review
      left join public.programs program on program.id = review.program_id
      left join public.program_applications application on application.id = review.application_id
      left join auth.users actor on actor.id = actor_uuid
      where review.id = review_uuid
        and (
          review.user_id = actor_uuid
          or program.created_by = actor_uuid
          or application.submitted_by = actor_uuid
          or (
            actor.email_confirmed_at is not null
            and lower(nullif(btrim(application.email), '')) =
              lower(nullif(btrim(actor.email), ''))
          )
        )
    );
$$;

revoke all privileges on function public.review_actor_owns_review(uuid, uuid)
from anon, authenticated, public;

create or replace function public.current_user_owns_review(review_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.review_actor_owns_review(review_uuid, (select auth.uid()));
$$;

revoke all privileges on function public.current_user_owns_review(uuid)
from anon, authenticated, public;
grant execute on function public.current_user_owns_review(uuid) to authenticated;

delete from public.review_helpful_votes vote
where public.review_actor_owns_review(vote.review_id, vote.user_id);

update public.review_reports report
set
  status = 'dismissed',
  resolution_note = coalesce(
    nullif(report.resolution_note, ''),
    'Dismissed automatically because reporter owns the review, its application, or its program.'
  ),
  resolved_at = coalesce(report.resolved_at, now()),
  updated_at = now()
where report.status in ('open', 'reviewing')
  and public.review_actor_owns_review(report.review_id, report.reporter_id);

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

  if public.review_actor_owns_review(new.review_id, new.user_id) is true then
    raise exception 'Users cannot mark their own reviews as helpful.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_invalid_review_helpful_vote()
from anon, authenticated, public;

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

  if public.review_actor_owns_review(new.review_id, new.reporter_id) is true then
    raise exception 'Users cannot report their own reviews.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_invalid_review_report()
from anon, authenticated, public;

drop policy if exists "Users can create own review helpful votes" on public.review_helpful_votes;
create policy "Users can create own review helpful votes"
on public.review_helpful_votes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.review_is_publicly_visible(review_id)
  and public.current_user_owns_review(review_id) is not true
);

drop policy if exists "Users can create review reports" on public.review_reports;
create policy "Users can create review reports"
on public.review_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and resolved_by is null
  and resolved_at is null
  and resolution_note is null
  and (
    reporter_email is null
    or lower(reporter_email) = any(public.current_user_verified_emails())
  )
  and public.review_is_publicly_visible(review_id)
  and public.current_user_owns_review(review_id) is not true
);
