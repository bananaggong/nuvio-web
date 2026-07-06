create or replace function public.prevent_terminal_review_report_reopen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status in ('resolved', 'dismissed')
    and new.status is distinct from old.status
  then
    raise exception 'Closed review reports cannot be reopened.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_terminal_review_report_reopen()
from anon, authenticated, public;

drop trigger if exists review_reports_prevent_terminal_reopen
on public.review_reports;

create trigger review_reports_prevent_terminal_reopen
before update of status
on public.review_reports
for each row
execute function public.prevent_terminal_review_report_reopen();
