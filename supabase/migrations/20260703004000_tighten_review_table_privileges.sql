revoke all privileges on table
  public.reviews,
  public.review_requests,
  public.review_moderation_checks,
  public.review_status_events,
  public.review_content_versions,
  public.review_request_events,
  public.review_host_replies,
  public.review_host_reply_events,
  public.review_helpful_votes,
  public.review_helpful_vote_events,
  public.review_reports,
  public.review_report_events,
  public.review_visibility_holds,
  public.review_visibility_hold_events
from anon, authenticated, public;

grant select on table public.reviews to anon, authenticated;
grant insert, update on table public.reviews to authenticated;

grant select, insert, update on table public.review_requests to authenticated;

grant select on table public.review_moderation_checks to authenticated;
grant select on table public.review_status_events to authenticated;
grant select on table public.review_content_versions to authenticated;
grant select on table public.review_request_events to authenticated;

grant select on table public.review_host_replies to anon, authenticated;
grant insert, update on table public.review_host_replies to authenticated;
grant select on table public.review_host_reply_events to authenticated;

grant select, insert, delete on table public.review_helpful_votes to authenticated;
grant select on table public.review_helpful_vote_events to authenticated;

grant select, insert, update on table public.review_reports to authenticated;
grant select on table public.review_report_events to authenticated;

grant select on table public.review_visibility_holds to authenticated;
grant select on table public.review_visibility_hold_events to authenticated;