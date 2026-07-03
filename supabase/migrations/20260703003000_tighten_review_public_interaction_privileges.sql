drop policy if exists "Public can read visible review host replies" on public.review_host_replies;

revoke all privileges on table public.review_helpful_votes from anon, authenticated, public;
grant select, insert, delete on table public.review_helpful_votes to authenticated;

revoke all privileges on table public.review_host_replies from anon, authenticated, public;
grant select on table public.review_host_replies to anon, authenticated;
grant insert, update on table public.review_host_replies to authenticated;

revoke all privileges on table public.review_reports from anon, authenticated, public;
grant select, insert, update on table public.review_reports to authenticated;
