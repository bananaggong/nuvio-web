create or replace function public.sync_review_request_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application_id uuid;
begin
  if tg_op = 'DELETE' then
    target_application_id := old.application_id;
    if target_application_id is not null then
      update public.review_requests request
      set
        status = 'pending',
        review_id = null,
        completed_at = null,
        updated_at = now()
      where request.application_id = target_application_id
        and request.status = 'completed'
        and not exists (
          select 1
          from public.reviews review
          where review.application_id = target_application_id
            and review.status <> 'deleted'
        );
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.application_id is not null
    and old.application_id is distinct from new.application_id
  then
    update public.review_requests request
    set
      status = 'pending',
      review_id = null,
      completed_at = null,
      updated_at = now()
    where request.application_id = old.application_id
      and request.status = 'completed'
      and not exists (
        select 1
        from public.reviews review
        where review.application_id = old.application_id
          and review.status <> 'deleted'
      );
  end if;

  target_application_id := new.application_id;
  if target_application_id is null then
    return new;
  end if;

  if new.status = 'deleted' then
    update public.review_requests request
    set
      status = 'pending',
      review_id = null,
      completed_at = null,
      updated_at = now()
    where request.application_id = target_application_id
      and request.status = 'completed'
      and not exists (
        select 1
        from public.reviews review
        where review.application_id = target_application_id
          and review.status <> 'deleted'
      );
    return new;
  end if;

  update public.review_requests request
  set
    status = 'completed',
    completed_at = coalesce(request.completed_at, new.submitted_at, new.created_at, now()),
    review_id = new.id,
    updated_at = now()
  where request.application_id = target_application_id;

  return new;
end;
$$;

with latest_application_reviews as (
  select distinct on (review.application_id)
    review.application_id,
    review.id,
    review.submitted_at,
    review.created_at
  from public.reviews review
  where review.application_id is not null
    and review.status <> 'deleted'
  order by
    review.application_id,
    coalesce(review.submitted_at, review.created_at) desc,
    review.created_at desc,
    review.id desc
)
update public.review_requests request
set
  review_id = review.id,
  completed_at = coalesce(request.completed_at, review.submitted_at, review.created_at, now()),
  cancelled_at = null,
  status = 'completed',
  updated_at = now()
from latest_application_reviews review
where request.application_id = review.application_id
  and request.status = 'completed'
  and (
    request.review_id is null
    or not exists (
      select 1
      from public.reviews current_review
      where current_review.id = request.review_id
        and current_review.status <> 'deleted'
    )
  );

update public.review_requests request
set
  status = 'completed',
  completed_at = coalesce(request.completed_at, review.submitted_at, review.created_at, now()),
  cancelled_at = null,
  updated_at = now()
from public.reviews review
where request.review_id = review.id
  and request.status <> 'completed'
  and review.status <> 'deleted';

update public.review_requests request
set
  status = 'pending',
  completed_at = null,
  review_id = null,
  updated_at = now()
where request.status = 'completed'
  and not exists (
    select 1
    from public.reviews review
    where review.id = request.review_id
      and review.status <> 'deleted'
  );

update public.review_requests
set
  completed_at = coalesce(completed_at, now()),
  cancelled_at = null,
  updated_at = now()
where status = 'completed'
  and review_id is not null
  and completed_at is null;

update public.review_requests
set
  completed_at = null,
  review_id = null,
  updated_at = now()
where status <> 'completed'
  and (completed_at is not null or review_id is not null);

update public.review_requests
set
  cancelled_at = coalesce(cancelled_at, now()),
  completed_at = null,
  review_id = null,
  updated_at = now()
where status = 'cancelled';

update public.review_requests
set
  cancelled_at = null,
  completed_at = null,
  review_id = null,
  updated_at = now()
where status <> 'cancelled'
  and status <> 'completed'
  and (cancelled_at is not null or completed_at is not null or review_id is not null);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_lifecycle_state_chk'
      and conrelid = 'public.review_requests'::regclass
  ) then
    alter table public.review_requests
      add constraint review_requests_lifecycle_state_chk
      check (
        (
          status = 'completed'
          and review_id is not null
          and completed_at is not null
          and cancelled_at is null
        )
        or (
          status = 'cancelled'
          and review_id is null
          and completed_at is null
          and cancelled_at is not null
        )
        or (
          status in ('pending', 'sent', 'opened', 'expired')
          and review_id is null
          and completed_at is null
          and cancelled_at is null
        )
      );
  end if;
end $$;