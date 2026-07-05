-- Treat false-information reports like other high-signal public safety reports:
-- keep the review out of public surfaces until a host resolves or dismisses it.
alter table public.review_visibility_holds
  drop constraint if exists review_visibility_holds_reason_chk;

alter table public.review_visibility_holds
  add constraint review_visibility_holds_reason_chk
  check (reason in (
    'high_risk_moderation',
    'privacy_report',
    'inappropriate_report',
    'spam_report',
    'false_information_report'
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
    'false_information_report'
  ));

create or replace function public.review_report_visibility_hold_reason(report_reason text)
returns text
language sql
immutable
as $$
  select case report_reason
    when 'privacy' then 'privacy_report'
    when 'inappropriate' then 'inappropriate_report'
    when 'spam' then 'spam_report'
    when 'false_information' then 'false_information_report'
    else null
  end;
$$;

revoke all privileges on function public.review_report_visibility_hold_reason(text) from anon, authenticated, public;

select public.activate_review_visibility_hold(
  report.review_id,
  'review_report',
  report.id,
  'false_information_report',
  jsonb_build_object(
    'source', 'migration_backfill',
    'reportId', report.id,
    'reason', report.reason,
    'status', report.status,
    'reportedAt', report.created_at
  )
)
from public.review_reports report
where report.reason = 'false_information'
  and report.status in ('open', 'reviewing');