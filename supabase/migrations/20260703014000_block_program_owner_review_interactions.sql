delete from public.review_helpful_votes vote
using public.reviews review
left join public.programs program on program.id = review.program_id
where review.id = vote.review_id
  and (
    (review.user_id is not null and review.user_id = vote.user_id)
    or (program.created_by is not null and program.created_by = vote.user_id)
  );

update public.review_reports report
set
  status = 'dismissed',
  resolution_note = coalesce(
    nullif(report.resolution_note, ''),
    'Dismissed automatically because reporter owns the review or its program.'
  ),
  resolved_at = coalesce(report.resolved_at, now()),
  updated_at = now()
from public.reviews review
left join public.programs program on program.id = review.program_id
where review.id = report.review_id
  and report.status in ('open', 'reviewing')
  and (
    (review.user_id is not null and report.reporter_id = review.user_id)
    or (program.created_by is not null and report.reporter_id = program.created_by)
  );

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
    left join public.programs program on program.id = review.program_id
    where review.id = new.review_id
      and (
        (review.user_id is not null and review.user_id = new.user_id)
        or (program.created_by is not null and program.created_by = new.user_id)
      )
  ) then
    raise exception 'Users cannot mark their own reviews as helpful.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_invalid_review_helpful_vote() from anon, authenticated, public;

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
    left join public.programs program on program.id = review.program_id
    where review.id = new.review_id
      and (
        (review.user_id is not null and review.user_id = new.reporter_id)
        or (program.created_by is not null and program.created_by = new.reporter_id)
      )
  ) then
    raise exception 'Users cannot report their own reviews.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_invalid_review_report() from anon, authenticated, public;

drop policy if exists "Users can create own review helpful votes" on public.review_helpful_votes;
create policy "Users can create own review helpful votes"
on public.review_helpful_votes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews review
    left join public.programs program on program.id = review.program_id
    where review.id = review_id
      and public.review_is_publicly_visible(review.id)
      and (review.user_id is null or review.user_id <> (select auth.uid()))
      and (program.created_by is null or program.created_by <> (select auth.uid()))
  )
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
  and exists (
    select 1
    from public.reviews review
    left join public.programs program on program.id = review.program_id
    where review.id = review_id
      and (review.user_id is null or review.user_id <> (select auth.uid()))
      and (program.created_by is null or program.created_by <> (select auth.uid()))
  )
);