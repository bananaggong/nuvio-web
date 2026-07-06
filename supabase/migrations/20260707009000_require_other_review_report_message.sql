alter table public.review_reports
  drop constraint if exists review_reports_other_message_chk;

alter table public.review_reports
  add constraint review_reports_other_message_chk
  check (
    reason <> 'other'
    or nullif(btrim(coalesce(message, '')), '') is not null
  );
