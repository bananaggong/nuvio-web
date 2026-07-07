-- In addition to high-signal individual report reasons, hold reviews that
-- accumulate multiple unresolved reports. This mirrors marketplace-style review
-- safety rules: enough independent unresolved reports should temporarily remove
-- the review from public surfaces until a host resolves the queue.
alter table public.review_visibility_holds
  drop constraint if exists review_visibility_holds_reason_chk;

alter table public.review_visibility_holds
  add constraint review_visibility_holds_reason_chk
  check (reason in (
    'high_risk_moderation',
    'privacy_report',
    'inappropriate_report',
    'spam_report',
    'false_information_report',
    'report_volume'
  ));

alter table public.review_visibility_hold_events
  drop constraint if exists review_visibility_hold_events_reason_chk;

alter table public.review_visibility_hold_events
  add constraint review_visibility_hold_events_reason_chk
  check (reason in (
    'high_risk_moderation',
    'privacy_report',
    'inappropriate_report',
    'spam_report',
    'false_information_report',
    'report_volume'
  ));

create or replace function public.sync_review_visibility_hold_from_report_volume(
  hold_review_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  open_report_count integer;
  open_report_reasons jsonb;
  report_threshold integer := 3;
begin
  if hold_review_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(jsonb_agg(distinct report.reason order by report.reason), '[]'::jsonb)
  into open_report_count, open_report_reasons
  from public.review_reports report
  where report.review_id = hold_review_id
    and report.status in ('open', 'reviewing');

  if open_report_count >= report_threshold then
    perform public.activate_review_visibility_hold(
      hold_review_id,
      'system',
      null,
      'report_volume',
      jsonb_build_object(
        'source', 'review_report_volume',
        'reportCount', open_report_count,
        'threshold', report_threshold,
        'reasons', open_report_reasons
      )
    );
  else
    perform public.release_review_visibility_hold(
      hold_review_id,
      'system',
      null,
      'report_volume'
    );
  end if;
end;
$$;

revoke all privileges on function public.sync_review_visibility_hold_from_report_volume(uuid)
from anon, authenticated, public;

create or replace function public.sync_review_visibility_hold_from_report_volume_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_review_visibility_hold_from_report_volume(old.review_id);
    return old;
  end if;

  perform public.sync_review_visibility_hold_from_report_volume(new.review_id);
  return new;
end;
$$;

revoke all privileges on function public.sync_review_visibility_hold_from_report_volume_trigger()
from anon, authenticated, public;

drop trigger if exists review_reports_sync_visibility_hold_volume
on public.review_reports;
create trigger review_reports_sync_visibility_hold_volume
after insert or update of status or delete
on public.review_reports
for each row
execute function public.sync_review_visibility_hold_from_report_volume_trigger();

select public.sync_review_visibility_hold_from_report_volume(report.review_id)
from (
  select distinct review_id
  from public.review_reports
) report;
