create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  reason text not null,
  message text,
  status text not null default 'open',
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_reports_reason_chk'
      and conrelid = 'public.review_reports'::regclass
  ) then
    alter table public.review_reports
      add constraint review_reports_reason_chk
      check (reason in ('inappropriate', 'privacy', 'spam', 'false_information', 'other'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_reports_status_chk'
      and conrelid = 'public.review_reports'::regclass
  ) then
    alter table public.review_reports
      add constraint review_reports_status_chk
      check (status in ('open', 'reviewing', 'resolved', 'dismissed'));
  end if;
end $$;

create unique index if not exists review_reports_review_reporter_unique_idx
  on public.review_reports(review_id, reporter_id)
  where reporter_id is not null;

create index if not exists review_reports_review_id_idx on public.review_reports(review_id);
create index if not exists review_reports_reporter_id_idx on public.review_reports(reporter_id);
create index if not exists review_reports_status_idx on public.review_reports(status);
create index if not exists review_reports_created_at_idx on public.review_reports(created_at desc);

alter table public.review_reports enable row level security;

drop policy if exists "Users can create review reports" on public.review_reports;
create policy "Users can create review reports"
on public.review_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.status = 'published'
  )
);

drop policy if exists "Users can read own review reports" on public.review_reports;
create policy "Users can read own review reports"
on public.review_reports for select
to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists "Host members can manage own review reports" on public.review_reports;
create policy "Host members can manage own review reports"
on public.review_reports for all
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

grant select, insert, update on table public.review_reports to authenticated;