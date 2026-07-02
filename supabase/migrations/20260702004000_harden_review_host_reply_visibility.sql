create or replace function public.normalize_review_host_reply_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'hidden' then
    new.hidden_at := coalesce(new.hidden_at, now());
  else
    new.hidden_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.normalize_review_host_reply_write() from public;

drop trigger if exists review_host_replies_normalize_before_write on public.review_host_replies;
create trigger review_host_replies_normalize_before_write
before insert or update of status, hidden_at
on public.review_host_replies
for each row
execute function public.normalize_review_host_reply_write();

create or replace function public.prevent_invalid_review_host_reply_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.reviews review
    where review.id = new.review_id
      and review.status in ('pending', 'published')
  ) then
    raise exception 'Host replies can only be attached to pending or published reviews.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_invalid_review_host_reply_review() from public;

drop trigger if exists review_host_replies_prevent_invalid_review on public.review_host_replies;
create trigger review_host_replies_prevent_invalid_review
before insert or update of review_id
on public.review_host_replies
for each row
execute function public.prevent_invalid_review_host_reply_review();

drop policy if exists "Public can read published review host replies" on public.review_host_replies;
create policy "Public can read published review host replies"
on public.review_host_replies for select
to anon, authenticated
using (
  status = 'published'
  and public.review_is_publicly_visible(review_id)
);

drop policy if exists "Host members can manage review host replies" on public.review_host_replies;
drop policy if exists "Host members can read review host replies" on public.review_host_replies;
drop policy if exists "Host members can create review host replies" on public.review_host_replies;
drop policy if exists "Host members can update review host replies" on public.review_host_replies;

create policy "Host members can read review host replies"
on public.review_host_replies for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

create policy "Host members can create review host replies"
on public.review_host_replies for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

create policy "Host members can update review host replies"
on public.review_host_replies for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

revoke delete on table public.review_host_replies from authenticated;