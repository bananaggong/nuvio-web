update public.review_request_events
set action = case
  when from_status is null and to_status = 'pending' then 'created'
  when from_status is null and to_status = 'sent' then
    case
      when coalesce(
        case
          when metadata ->> 'requestCount' ~ '^[0-9]+$'
            then (metadata ->> 'requestCount')::integer
          else 0
        end,
        0
      ) > 1 then 'resent'
      else 'requested'
    end
  when from_status is null and to_status = 'opened' then 'opened'
  when from_status is null and to_status = 'completed' then 'completed'
  when from_status is null and to_status = 'cancelled' then 'cancelled'
  when from_status is null and to_status = 'expired' then 'expired'
  when from_status = to_status then
    case
      when action = 'resent' then 'resent'
      else 'status_changed'
    end
  when from_status = 'completed' and to_status <> 'completed' then 'reopened'
  when from_status in ('cancelled', 'expired') and to_status = 'pending' then 'reopened'
  when to_status = 'sent' then
    case
      when action in ('requested', 'resent') then action
      else 'sent'
    end
  when to_status = 'opened' then 'opened'
  when to_status = 'completed' then 'completed'
  when to_status = 'cancelled' then 'cancelled'
  when to_status = 'expired' then 'expired'
  else 'status_changed'
end
where not (
  (
    from_status is null
    and to_status = 'pending'
    and action = 'created'
  )
  or (
    from_status is null
    and to_status = 'sent'
    and action in ('requested', 'resent')
  )
  or (
    from_status is null
    and to_status = 'opened'
    and action = 'opened'
  )
  or (
    from_status is null
    and to_status = 'completed'
    and action = 'completed'
  )
  or (
    from_status is null
    and to_status = 'cancelled'
    and action = 'cancelled'
  )
  or (
    from_status is null
    and to_status = 'expired'
    and action = 'expired'
  )
  or (
    from_status is not null
    and from_status = to_status
    and action in ('resent', 'status_changed')
  )
  or (
    from_status = 'completed'
    and to_status <> 'completed'
    and action = 'reopened'
  )
  or (
    from_status in ('cancelled', 'expired')
    and to_status = 'pending'
    and action = 'reopened'
  )
  or (
    from_status is distinct from to_status
    and to_status = 'sent'
    and action in ('requested', 'sent', 'resent')
  )
  or (
    from_status is distinct from to_status
    and to_status = 'opened'
    and action = 'opened'
  )
  or (
    from_status is distinct from to_status
    and to_status = 'completed'
    and action = 'completed'
  )
  or (
    from_status is distinct from to_status
    and to_status = 'cancelled'
    and action = 'cancelled'
  )
  or (
    from_status is distinct from to_status
    and to_status = 'expired'
    and action = 'expired'
  )
);

alter table public.review_request_events
  drop constraint if exists review_request_events_transition_action_chk;

alter table public.review_request_events
  add constraint review_request_events_transition_action_chk
  check (
    (
      from_status is null
      and to_status = 'pending'
      and action = 'created'
    )
    or (
      from_status is null
      and to_status = 'sent'
      and action in ('requested', 'resent')
    )
    or (
      from_status is null
      and to_status = 'opened'
      and action = 'opened'
    )
    or (
      from_status is null
      and to_status = 'completed'
      and action = 'completed'
    )
    or (
      from_status is null
      and to_status = 'cancelled'
      and action = 'cancelled'
    )
    or (
      from_status is null
      and to_status = 'expired'
      and action = 'expired'
    )
    or (
      from_status is not null
      and from_status = to_status
      and action in ('resent', 'status_changed')
    )
    or (
      from_status = 'completed'
      and to_status <> 'completed'
      and action = 'reopened'
    )
    or (
      from_status in ('cancelled', 'expired')
      and to_status = 'pending'
      and action = 'reopened'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'sent'
      and action in ('requested', 'sent', 'resent')
    )
    or (
      from_status is distinct from to_status
      and to_status = 'opened'
      and action = 'opened'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'completed'
      and action = 'completed'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'cancelled'
      and action = 'cancelled'
    )
    or (
      from_status is distinct from to_status
      and to_status = 'expired'
      and action = 'expired'
    )
  );
