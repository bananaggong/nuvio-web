update public.review_reports
set
  resolution_note = left(
    coalesce(nullif(btrim(resolution_note), ''), 'Closed before resolution notes were required.'),
    1000
  ),
  resolved_at = coalesce(resolved_at, updated_at, created_at, now()),
  updated_at = now()
where status in ('resolved', 'dismissed')
  and (
    nullif(btrim(coalesce(resolution_note, '')), '') is null
    or resolved_at is null
  );

update public.review_reports
set
  resolved_at = null,
  resolved_by = null,
  resolution_note = null,
  updated_at = now()
where status in ('open', 'reviewing')
  and (
    resolved_at is not null
    or resolved_by is not null
    or resolution_note is not null
  );

create or replace function public.normalize_review_report_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('resolved', 'dismissed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    new.resolved_by := coalesce(new.resolved_by, (select auth.uid()));
    new.resolution_note := nullif(btrim(coalesce(new.resolution_note, '')), '');

    if new.resolution_note is null then
      raise exception 'Resolved or dismissed review reports require a resolution note.'
        using errcode = '23514';
    end if;
  else
    new.resolved_at := null;
    new.resolved_by := null;
    new.resolution_note := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all privileges on function public.normalize_review_report_lifecycle() from anon, authenticated, public;

alter table public.review_reports
  drop constraint if exists review_reports_resolution_state_chk;

alter table public.review_reports
  add constraint review_reports_resolution_state_chk
  check (
    (
      status in ('resolved', 'dismissed')
      and resolved_at is not null
      and nullif(btrim(coalesce(resolution_note, '')), '') is not null
    )
    or (
      status in ('open', 'reviewing')
      and resolved_at is null
      and resolved_by is null
      and resolution_note is null
    )
  );
