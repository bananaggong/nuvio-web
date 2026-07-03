update public.reviews
set
  published_at = coalesce(published_at, created_at, now()),
  updated_at = now()
where status = 'published'
  and published_at is null;

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
      and not exists (
        select 1
        from public.review_visibility_holds hold
        where hold.review_id = review.id
          and hold.status = 'active'
      )
  );
$$;

revoke all privileges on function public.review_is_publicly_visible(uuid) from anon, authenticated, public;