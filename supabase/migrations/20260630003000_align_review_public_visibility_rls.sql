create or replace function public.review_is_publicly_visible(review_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews review
    where review.id = review_uuid
      and review.status = 'published'
      and not exists (
        select 1
        from public.review_moderation_checks moderation
        where moderation.review_id = review.id
          and moderation.risk_level = 'high'
      )
      and not exists (
        select 1
        from public.review_reports report
        where report.review_id = review.id
          and report.status in ('open', 'reviewing')
          and report.reason in ('privacy', 'inappropriate', 'spam')
      )
  );
$$;

revoke all on function public.review_is_publicly_visible(uuid) from public;
grant execute on function public.review_is_publicly_visible(uuid) to anon, authenticated;

drop policy if exists "Public can read published reviews" on public.reviews;
drop policy if exists "Public can read publicly visible reviews" on public.reviews;
create policy "Public can read publicly visible reviews"
on public.reviews for select
to anon, authenticated
using (public.review_is_publicly_visible(id));

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
);

drop policy if exists "Public can read published review host replies" on public.review_host_replies;
drop policy if exists "Public can read visible review host replies" on public.review_host_replies;
create policy "Public can read visible review host replies"
on public.review_host_replies for select
to anon, authenticated
using (
  status = 'published'
  and public.review_is_publicly_visible(review_id)
);