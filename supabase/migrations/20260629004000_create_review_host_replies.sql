create table if not exists public.review_host_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null,
  status text not null default 'published',
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_host_replies_status_chk'
      and conrelid = 'public.review_host_replies'::regclass
  ) then
    alter table public.review_host_replies
      add constraint review_host_replies_status_chk
      check (status in ('published', 'hidden'));
  end if;
end $$;

create unique index if not exists review_host_replies_review_id_unique_idx
  on public.review_host_replies(review_id);

create index if not exists review_host_replies_author_id_idx on public.review_host_replies(author_id);
create index if not exists review_host_replies_status_idx on public.review_host_replies(status);
create index if not exists review_host_replies_created_at_idx on public.review_host_replies(created_at desc);

alter table public.review_host_replies enable row level security;

drop policy if exists "Public can read published review host replies" on public.review_host_replies;
create policy "Public can read published review host replies"
on public.review_host_replies for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.status = 'published'
  )
);

drop policy if exists "Host members can manage review host replies" on public.review_host_replies;
create policy "Host members can manage review host replies"
on public.review_host_replies for all
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
)
with check (
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

grant select on table public.review_host_replies to anon, authenticated;
grant insert, update, delete on table public.review_host_replies to authenticated;