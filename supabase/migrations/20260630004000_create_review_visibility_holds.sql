create table if not exists public.review_visibility_holds (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  reason text not null,
  status text not null default 'active',
  held_at timestamptz not null default now(),
  released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_visibility_holds_review_id_idx
  on public.review_visibility_holds(review_id);
create index if not exists review_visibility_holds_status_idx
  on public.review_visibility_holds(status);
create index if not exists review_visibility_holds_reason_idx
  on public.review_visibility_holds(reason);
create index if not exists review_visibility_holds_source_idx
  on public.review_visibility_holds(source_type, source_id);
create unique index if not exists review_visibility_holds_source_unique_idx
  on public.review_visibility_holds(source_type, source_id, reason)
  where source_id is not null;
create unique index if not exists review_visibility_holds_system_unique_idx
  on public.review_visibility_holds(review_id, source_type, reason)
  where source_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_holds_source_type_chk'
      and conrelid = 'public.review_visibility_holds'::regclass
  ) then
    alter table public.review_visibility_holds
      add constraint review_visibility_holds_source_type_chk
      check (source_type in ('moderation_check', 'review_report', 'system'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_holds_reason_chk'
      and conrelid = 'public.review_visibility_holds'::regclass
  ) then
    alter table public.review_visibility_holds
      add constraint review_visibility_holds_reason_chk
      check (reason in ('high_risk_moderation', 'privacy_report', 'inappropriate_report', 'spam_report'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_holds_status_chk'
      and conrelid = 'public.review_visibility_holds'::regclass
  ) then
    alter table public.review_visibility_holds
      add constraint review_visibility_holds_status_chk
      check (status in ('active', 'released'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_holds_release_state_chk'
      and conrelid = 'public.review_visibility_holds'::regclass
  ) then
    alter table public.review_visibility_holds
      add constraint review_visibility_holds_release_state_chk
      check (status = 'active' or released_at is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_visibility_holds_metadata_shape_chk'
      and conrelid = 'public.review_visibility_holds'::regclass
  ) then
    alter table public.review_visibility_holds
      add constraint review_visibility_holds_metadata_shape_chk
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

create or replace function public.review_report_visibility_hold_reason(report_reason text)
returns text
language sql
immutable
as $$
  select case report_reason
    when 'privacy' then 'privacy_report'
    when 'inappropriate' then 'inappropriate_report'
    when 'spam' then 'spam_report'
    else null
  end;
$$;

revoke all on function public.review_report_visibility_hold_reason(text) from public;
grant execute on function public.review_report_visibility_hold_reason(text) to authenticated;

create or replace function public.activate_review_visibility_hold(
  hold_review_id uuid,
  hold_source_type text,
  hold_source_id uuid,
  hold_reason text,
  hold_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if hold_source_id is null then
    update public.review_visibility_holds
    set
      status = 'active',
      released_at = null,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = now()
    where review_id = hold_review_id
      and source_type = hold_source_type
      and source_id is null
      and reason = hold_reason;

    if found then
      return;
    end if;
  else
    update public.review_visibility_holds
    set
      review_id = hold_review_id,
      status = 'active',
      released_at = null,
      metadata = coalesce(hold_metadata, '{}'::jsonb),
      updated_at = now()
    where source_type = hold_source_type
      and source_id = hold_source_id
      and reason = hold_reason;

    if found then
      return;
    end if;
  end if;

  insert into public.review_visibility_holds (
    review_id,
    source_type,
    source_id,
    reason,
    status,
    metadata,
    held_at,
    updated_at
  ) values (
    hold_review_id,
    hold_source_type,
    hold_source_id,
    hold_reason,
    'active',
    coalesce(hold_metadata, '{}'::jsonb),
    now(),
    now()
  );
end;
$$;

create or replace function public.release_review_visibility_hold(
  hold_review_id uuid,
  hold_source_type text,
  hold_source_id uuid,
  hold_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.review_visibility_holds
  set
    status = 'released',
    released_at = coalesce(released_at, now()),
    updated_at = now()
  where review_id = hold_review_id
    and source_type = hold_source_type
    and (hold_source_id is null and source_id is null or hold_source_id is not null and source_id = hold_source_id)
    and (hold_reason is null or reason = hold_reason)
    and status = 'active';
end;
$$;

create or replace function public.sync_review_visibility_hold_from_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.release_review_visibility_hold(
      old.review_id,
      'moderation_check',
      null,
      'high_risk_moderation'
    );
    return old;
  end if;

  if new.risk_level = 'high' then
    perform public.activate_review_visibility_hold(
      new.review_id,
      'moderation_check',
      null,
      'high_risk_moderation',
      jsonb_build_object(
        'source', 'moderation_check',
        'riskLevel', new.risk_level,
        'riskScore', new.risk_score,
        'flags', new.flags,
        'checkedAt', new.checked_at
      )
    );
  else
    perform public.release_review_visibility_hold(
      new.review_id,
      'moderation_check',
      null,
      'high_risk_moderation'
    );
  end if;

  return new;
end;
$$;

create or replace function public.sync_review_visibility_hold_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hold_reason text;
begin
  if tg_op = 'DELETE' then
    perform public.release_review_visibility_hold(
      old.review_id,
      'review_report',
      old.id,
      null
    );
    return old;
  end if;

  perform public.release_review_visibility_hold(
    new.review_id,
    'review_report',
    new.id,
    null
  );

  hold_reason := public.review_report_visibility_hold_reason(new.reason);
  if hold_reason is not null and new.status in ('open', 'reviewing') then
    perform public.activate_review_visibility_hold(
      new.review_id,
      'review_report',
      new.id,
      hold_reason,
      jsonb_build_object(
        'source', 'review_report',
        'reportId', new.id,
        'reason', new.reason,
        'status', new.status,
        'reportedAt', new.created_at
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists review_moderation_checks_sync_visibility_hold on public.review_moderation_checks;
create trigger review_moderation_checks_sync_visibility_hold
after insert or update of risk_level, risk_score, flags, checked_at or delete
on public.review_moderation_checks
for each row
execute function public.sync_review_visibility_hold_from_moderation();

drop trigger if exists review_reports_sync_visibility_hold on public.review_reports;
create trigger review_reports_sync_visibility_hold
after insert or update of reason, status, updated_at or delete
on public.review_reports
for each row
execute function public.sync_review_visibility_hold_from_report();

insert into public.review_visibility_holds (
  review_id,
  source_type,
  source_id,
  reason,
  status,
  metadata,
  held_at,
  updated_at
)
select
  moderation.review_id,
  'moderation_check',
  null,
  'high_risk_moderation',
  'active',
  jsonb_build_object(
    'source', 'migration_backfill',
    'riskLevel', moderation.risk_level,
    'riskScore', moderation.risk_score,
    'flags', moderation.flags,
    'checkedAt', moderation.checked_at
  ),
  coalesce(moderation.checked_at, moderation.created_at, now()),
  now()
from public.review_moderation_checks moderation
where moderation.risk_level = 'high'
on conflict do nothing;

insert into public.review_visibility_holds (
  review_id,
  source_type,
  source_id,
  reason,
  status,
  metadata,
  held_at,
  updated_at
)
select
  report.review_id,
  'review_report',
  report.id,
  public.review_report_visibility_hold_reason(report.reason),
  'active',
  jsonb_build_object(
    'source', 'migration_backfill',
    'reportId', report.id,
    'reason', report.reason,
    'status', report.status,
    'reportedAt', report.created_at
  ),
  coalesce(report.created_at, now()),
  now()
from public.review_reports report
where report.status in ('open', 'reviewing')
  and public.review_report_visibility_hold_reason(report.reason) is not null
on conflict do nothing;

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
      and not exists (
        select 1
        from public.review_visibility_holds hold
        where hold.review_id = review.id
          and hold.status = 'active'
      )
  );
$$;

revoke all on function public.review_is_publicly_visible(uuid) from public;
grant execute on function public.review_is_publicly_visible(uuid) to anon, authenticated;

alter table public.review_visibility_holds enable row level security;

drop policy if exists "Host members can read review visibility holds" on public.review_visibility_holds;
create policy "Host members can read review visibility holds"
on public.review_visibility_holds for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_visibility_holds.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

drop policy if exists "Host members can manage review visibility holds" on public.review_visibility_holds;
create policy "Host members can manage review visibility holds"
on public.review_visibility_holds for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_visibility_holds.review_id
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
    where review.id = public.review_visibility_holds.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update on table public.review_visibility_holds to authenticated;