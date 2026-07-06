-- Keep review report moderation notes bounded at the same size the API accepts.
-- Report messages already have this limit; resolution notes and their audit
-- snapshots need the same database-level guard before public review reporting
-- is opened more broadly.
update public.review_reports
set
  resolution_note = left(resolution_note, 1000),
  updated_at = now()
where resolution_note is not null
  and char_length(resolution_note) > 1000;

alter table public.review_reports
  drop constraint if exists review_reports_resolution_note_length_chk;

alter table public.review_reports
  add constraint review_reports_resolution_note_length_chk
  check (resolution_note is null or char_length(resolution_note) <= 1000);

alter table public.review_report_events
  drop constraint if exists review_report_events_message_length_chk;

alter table public.review_report_events
  add constraint review_report_events_message_length_chk
  check (message is null or char_length(message) <= 1000);

alter table public.review_report_events
  drop constraint if exists review_report_events_resolution_note_length_chk;

alter table public.review_report_events
  add constraint review_report_events_resolution_note_length_chk
  check (resolution_note is null or char_length(resolution_note) <= 1000);
