do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_likes_nonnegative_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_likes_nonnegative_chk
      check (likes >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_comments_nonnegative_chk'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_comments_nonnegative_chk
      check (comments >= 0);
  end if;
end $$;

create or replace function public.recalculate_review_helpful_count(review_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if review_uuid is null then
    return;
  end if;

  update public.reviews review
  set
    likes = coalesce((
      select count(*)::integer
      from public.review_helpful_votes vote
      where vote.review_id = review_uuid
    ), 0),
    updated_at = now()
  where review.id = review_uuid;
end;
$$;

create or replace function public.recalculate_review_host_reply_count(review_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if review_uuid is null then
    return;
  end if;

  update public.reviews review
  set
    comments = coalesce((
      select count(*)::integer
      from public.review_host_replies reply
      where reply.review_id = review_uuid
        and reply.status = 'published'
    ), 0),
    updated_at = now()
  where review.id = review_uuid;
end;
$$;

revoke all on function public.recalculate_review_helpful_count(uuid) from public;
revoke all on function public.recalculate_review_host_reply_count(uuid) from public;

create or replace function public.sync_review_helpful_count_from_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_review_helpful_count(old.review_id);
    return old;
  end if;

  perform public.recalculate_review_helpful_count(new.review_id);
  return new;
end;
$$;

create or replace function public.sync_review_host_reply_count_from_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_review_host_reply_count(old.review_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.review_id is distinct from new.review_id then
    perform public.recalculate_review_host_reply_count(old.review_id);
  end if;

  perform public.recalculate_review_host_reply_count(new.review_id);
  return new;
end;
$$;

drop trigger if exists review_helpful_votes_sync_review_likes on public.review_helpful_votes;
create trigger review_helpful_votes_sync_review_likes
after insert or delete
on public.review_helpful_votes
for each row
execute function public.sync_review_helpful_count_from_vote();

drop trigger if exists review_host_replies_sync_review_comments on public.review_host_replies;
create trigger review_host_replies_sync_review_comments
after insert or update of review_id, status or delete
on public.review_host_replies
for each row
execute function public.sync_review_host_reply_count_from_reply();

update public.reviews review
set
  likes = coalesce(helpful.count, 0),
  comments = coalesce(reply.count, 0),
  updated_at = now()
from (
  select
    target.id,
    coalesce((
      select count(*)::integer
      from public.review_helpful_votes vote
      where vote.review_id = target.id
    ), 0) as count
  from public.reviews target
) helpful,
(
  select
    target.id,
    coalesce((
      select count(*)::integer
      from public.review_host_replies host_reply
      where host_reply.review_id = target.id
        and host_reply.status = 'published'
    ), 0) as count
  from public.reviews target
) reply
where review.id = helpful.id
  and review.id = reply.id
  and (review.likes is distinct from helpful.count or review.comments is distinct from reply.count);