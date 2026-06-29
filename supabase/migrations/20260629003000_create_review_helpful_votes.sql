create table if not exists public.review_helpful_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_helpful_votes_user_id_idx
  on public.review_helpful_votes(user_id);

alter table public.review_helpful_votes enable row level security;

drop policy if exists "Users can manage own review helpful votes" on public.review_helpful_votes;
create policy "Users can manage own review helpful votes"
on public.review_helpful_votes for all
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.status = 'published'
  )
);

drop policy if exists "Hosts can read review helpful votes" on public.review_helpful_votes;
create policy "Hosts can read review helpful votes"
on public.review_helpful_votes for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and (
        (r.village_slug is not null and public.current_user_can_edit_village_slug(r.village_slug))
        or (r.program_id is not null and public.current_user_can_edit_program(r.program_id))
      )
  )
);

grant select, insert, delete on table public.review_helpful_votes to authenticated;