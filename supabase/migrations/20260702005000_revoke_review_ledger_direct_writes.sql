drop policy if exists "Host members can manage review status events" on public.review_status_events;
drop policy if exists "Host members can manage review content versions" on public.review_content_versions;
drop policy if exists "Host members can manage review request events" on public.review_request_events;
drop policy if exists "Host members can manage review host reply events" on public.review_host_reply_events;
drop policy if exists "Host members can manage review report events" on public.review_report_events;
drop policy if exists "Host members can manage review visibility hold events" on public.review_visibility_hold_events;
drop policy if exists "Host members can manage review helpful vote events" on public.review_helpful_vote_events;

revoke insert, update, delete on table public.review_status_events from authenticated;
revoke insert, update, delete on table public.review_content_versions from authenticated;
revoke insert, update, delete on table public.review_request_events from authenticated;
revoke insert, update, delete on table public.review_host_reply_events from authenticated;
revoke insert, update, delete on table public.review_report_events from authenticated;
revoke insert, update, delete on table public.review_visibility_hold_events from authenticated;
revoke insert, update, delete on table public.review_helpful_vote_events from authenticated;

grant select on table public.review_status_events to authenticated;
grant select on table public.review_content_versions to authenticated;
grant select on table public.review_request_events to authenticated;
grant select on table public.review_host_reply_events to authenticated;
grant select on table public.review_report_events to authenticated;
grant select on table public.review_visibility_hold_events to authenticated;
grant select on table public.review_helpful_vote_events to authenticated;