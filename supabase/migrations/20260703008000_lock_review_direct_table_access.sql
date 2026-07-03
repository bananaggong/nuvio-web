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
