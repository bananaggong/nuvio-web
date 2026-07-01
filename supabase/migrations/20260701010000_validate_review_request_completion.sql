update public.review_requests request
set
  status = 'pending',
  review_id = null,
  completed_at = null,
  cancelled_at = null,
  updated_at = now()
where request.status = 'completed'
  and not exists (
    select 1
    from public.reviews review
    where review.id = request.review_id
      and review.application_id = request.application_id
      and review.status <> 'deleted'
  );

create or replace function public.validate_review_request_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' then
    if new.review_id is null then
      raise exception 'Completed review requests must reference a review.';
    end if;

    if new.completed_at is null then
      raise exception 'Completed review requests must have a completion timestamp.';
    end if;

    if not exists (
      select 1
      from public.reviews review
      where review.id = new.review_id
        and review.application_id = new.application_id
        and review.status <> 'deleted'
    ) then
      raise exception 'Completed review requests must reference a non-deleted review for the same application.';
    end if;
  else
    if new.review_id is not null or new.completed_at is not null then
      raise exception 'Only completed review requests can reference a review or completion timestamp.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_review_request_completion() from public;

drop trigger if exists review_requests_validate_completion_before_write on public.review_requests;
create trigger review_requests_validate_completion_before_write
before insert or update of status, review_id, completed_at, cancelled_at, application_id
on public.review_requests
for each row
execute function public.validate_review_request_completion();
