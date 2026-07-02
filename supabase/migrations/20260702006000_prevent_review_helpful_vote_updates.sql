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

  if tg_op = 'UPDATE' and old.review_id is distinct from new.review_id then
    perform public.recalculate_review_helpful_count(old.review_id);
  end if;

  perform public.recalculate_review_helpful_count(new.review_id);
  return new;
end;
$$;

revoke all on function public.sync_review_helpful_count_from_vote() from public;

drop trigger if exists review_helpful_votes_sync_review_likes on public.review_helpful_votes;
create trigger review_helpful_votes_sync_review_likes
after insert or update of review_id or delete
on public.review_helpful_votes
for each row
execute function public.sync_review_helpful_count_from_vote();

drop policy if exists "Users can manage own review helpful votes" on public.review_helpful_votes;
drop policy if exists "Users can read own review helpful votes" on public.review_helpful_votes;
drop policy if exists "Users can create own review helpful votes" on public.review_helpful_votes;
drop policy if exists "Users can delete own review helpful votes" on public.review_helpful_votes;

create policy "Users can read own review helpful votes"
on public.review_helpful_votes for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create own review helpful votes"
on public.review_helpful_votes for insert
to authenticated
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

create policy "Users can delete own review helpful votes"
on public.review_helpful_votes for delete
to authenticated
using (user_id = (select auth.uid()));

revoke update on table public.review_helpful_votes from authenticated;
grant select, insert, delete on table public.review_helpful_votes to authenticated;