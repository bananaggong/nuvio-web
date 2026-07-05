-- Keep public review visibility aligned with the public program surface.
-- Reviews attached to an unpublished program must not appear in global lists,
-- summaries, replies, helpful votes, or report flows that rely on this helper.
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
      and review.published_at is not null
      and review.published_at <= now()
      and (
        review.program_id is null
        or exists (
          select 1
          from public.programs program
          where program.id = review.program_id
            and program.published_at is not null
        )
      )
      and not exists (
        select 1
        from public.review_visibility_holds hold
        where hold.review_id = review.id
          and hold.status = 'active'
      )
  );
$$;

revoke all privileges on function public.review_is_publicly_visible(uuid) from anon, authenticated, public;