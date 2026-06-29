create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.program_applications(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  program_run_id uuid references public.program_runs(id) on delete set null,
  village_slug text,
  recipient_email text not null,
  recipient_name text not null,
  status text not null default 'pending',
  request_count integer not null default 0,
  last_requested_at timestamptz,
  next_reminder_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  review_id uuid references public.reviews(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists review_requests_application_id_unique_idx
  on public.review_requests(application_id);
create index if not exists review_requests_program_id_idx on public.review_requests(program_id);
create index if not exists review_requests_program_run_id_idx on public.review_requests(program_run_id);
create index if not exists review_requests_village_slug_idx on public.review_requests(village_slug);
create index if not exists review_requests_status_idx on public.review_requests(status);
create index if not exists review_requests_last_requested_at_idx on public.review_requests(last_requested_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_status_chk'
      and conrelid = 'public.review_requests'::regclass
  ) then
    alter table public.review_requests
      add constraint review_requests_status_chk
      check (status in ('pending', 'sent', 'opened', 'completed', 'cancelled', 'expired'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_request_count_chk'
      and conrelid = 'public.review_requests'::regclass
  ) then
    alter table public.review_requests
      add constraint review_requests_request_count_chk
      check (request_count >= 0 and request_count <= 20);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_recipient_email_chk'
      and conrelid = 'public.review_requests'::regclass
  ) then
    alter table public.review_requests
      add constraint review_requests_recipient_email_chk
      check (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
  end if;
end $$;

create or replace function public.current_user_owns_application(application_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_applications application
    where application.id = application_uuid
      and (
        application.submitted_by = (select auth.uid())
        or lower(application.email) = any(public.current_user_profile_emails())
      )
  );
$$;

revoke all on function public.current_user_owns_application(uuid) from public;
grant execute on function public.current_user_owns_application(uuid) to authenticated;

create or replace function public.normalize_review_request_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  application_context record;
begin
  select
    application.email,
    application.applicant_name,
    application.program_id,
    application.program_run_id,
    application.status as application_status,
    village.slug as village_slug
  into application_context
  from public.program_applications application
  left join public.programs program on program.id = application.program_id
  left join public.villages village on village.id = program.village_id
  where application.id = new.application_id;

  if not found then
    raise exception 'Review request application was not found.';
  end if;

  if new.status not in ('completed', 'cancelled', 'expired')
    and application_context.application_status not in ('accepted', 'checkedIn', 'completed') then
    raise exception 'This application is not eligible for a review request yet.';
  end if;

  new.program_id := application_context.program_id;
  new.program_run_id := application_context.program_run_id;
  new.village_slug := application_context.village_slug;
  new.recipient_email := lower(btrim(application_context.email));
  new.recipient_name := left(btrim(application_context.applicant_name), 120);

  if tg_op = 'INSERT' then
    new.expires_at := coalesce(new.expires_at, now() + interval '60 days');
  end if;

  if new.status in ('pending', 'sent', 'opened') then
    new.cancelled_at := null;
    new.completed_at := null;
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  else
    new.cancelled_at := null;
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  if new.status = 'expired' and new.expires_at is null then
    new.expires_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists review_requests_normalize_before_write on public.review_requests;
create trigger review_requests_normalize_before_write
before insert or update on public.review_requests
for each row
execute function public.normalize_review_request_write();

create or replace function public.sync_review_request_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application_id uuid;
begin
  if tg_op = 'DELETE' then
    target_application_id := old.application_id;
    if target_application_id is not null then
      update public.review_requests request
      set
        status = case
          when exists (
            select 1 from public.reviews review
            where review.application_id = target_application_id
          ) then request.status
          else 'pending'
        end,
        review_id = case
          when exists (
            select 1 from public.reviews review
            where review.application_id = target_application_id
          ) then request.review_id
          else null
        end,
        completed_at = case
          when exists (
            select 1 from public.reviews review
            where review.application_id = target_application_id
          ) then request.completed_at
          else null
        end,
        updated_at = now()
      where request.application_id = target_application_id
        and request.status = 'completed';
    end if;
    return old;
  end if;

  target_application_id := new.application_id;
  if target_application_id is not null then
    update public.review_requests request
    set
      status = 'completed',
      completed_at = coalesce(request.completed_at, now()),
      review_id = new.id,
      updated_at = now()
    where request.application_id = target_application_id;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_sync_review_request_after_write on public.reviews;
create trigger reviews_sync_review_request_after_write
after insert or delete or update of application_id, status on public.reviews
for each row
execute function public.sync_review_request_from_review();

alter table public.review_requests enable row level security;

drop policy if exists "Users can read own review requests" on public.review_requests;
create policy "Users can read own review requests"
on public.review_requests for select
to authenticated
using (public.current_user_owns_application(application_id));

drop policy if exists "Host members can manage review requests" on public.review_requests;
create policy "Host members can manage review requests"
on public.review_requests for all
to authenticated
using (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
)
with check (
  public.is_admin()
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
  or (
    village_slug is not null
    and public.current_user_can_edit_village_slug(village_slug)
  )
);

grant select on table public.review_requests to authenticated;
grant insert, update, delete on table public.review_requests to authenticated;