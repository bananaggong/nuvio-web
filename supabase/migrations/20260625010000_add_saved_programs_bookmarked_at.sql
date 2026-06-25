alter table public.saved_programs
  add column if not exists bookmarked_at timestamptz;

update public.saved_programs
set bookmarked_at = coalesce(bookmarked_at, updated_at, created_at, now())
where bookmarked = true;

create index if not exists saved_programs_user_bookmarked_at_idx
  on public.saved_programs (user_id, bookmarked_at desc)
  where bookmarked = true;
