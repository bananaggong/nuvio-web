-- Phase 2 runs only after the claim-aware application is deployed. It aborts
-- before DDL if an old worker left a processing row without claim ownership or
-- if legacy delivery state is inconsistent. It contains no cleanup DML.

do $preflight$
declare
  invalid_notification_claims bigint;
  invalid_scheduled_message_claims bigint;
  invalid_scheduled_message_state bigint;
begin
  select count(*)
  into invalid_notification_claims
  from public.notification_events
  where status = 'processing'
    and (claim_token is null or claimed_at is null);

  select count(*)
  into invalid_scheduled_message_claims
  from public.scheduled_messages
  where delivery_status = 'processing'
    and (claim_token is null or claimed_at is null);

  select count(*)
  into invalid_scheduled_message_state
  from public.scheduled_messages
  where (delivery_status = 'sent' and sent_at is null)
    or (delivery_status <> 'sent' and sent_at is not null);

  if invalid_notification_claims > 0
    or invalid_scheduled_message_claims > 0
    or invalid_scheduled_message_state > 0
  then
    raise exception using
      errcode = '23514',
      message = format(
        'NUVIO async delivery preflight failed: invalid_notification_claims=%s, invalid_scheduled_message_claims=%s, invalid_scheduled_message_state=%s',
        invalid_notification_claims,
        invalid_scheduled_message_claims,
        invalid_scheduled_message_state
      ),
      hint = 'Wait for active workers to finish and resolve delivery-state findings before retrying. This migration does not alter queue rows.';
  end if;
end
$preflight$;

alter table public.notification_events
  drop constraint if exists notification_events_claim_state_chk,
  add constraint notification_events_claim_state_chk
    check (
      (
        status = 'processing'
        and claim_token is not null
        and claimed_at is not null
      )
      or (
        status <> 'processing'
        and claim_token is null
        and claimed_at is null
      )
    ) not valid;

alter table public.notification_events
  validate constraint notification_events_claim_state_chk;

alter table public.scheduled_messages
  drop constraint if exists scheduled_messages_delivery_state_chk,
  add constraint scheduled_messages_delivery_state_chk
    check (
      (
        delivery_status = 'processing'
        and attempt_count > 0
        and last_attempt_at is not null
        and claim_token is not null
        and claimed_at is not null
        and sent_at is null
        and next_attempt_at is null
      )
      or (
        delivery_status = 'sent'
        and sent_at is not null
        and claim_token is null
        and claimed_at is null
        and next_attempt_at is null
      )
      or (
        delivery_status in ('draft', 'scheduled', 'failed')
        and sent_at is null
        and claim_token is null
        and claimed_at is null
      )
    ) not valid;

alter table public.scheduled_messages
  validate constraint scheduled_messages_delivery_state_chk;
