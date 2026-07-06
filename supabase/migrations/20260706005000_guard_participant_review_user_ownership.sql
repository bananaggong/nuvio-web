-- Keep participant review ownership tied to the application owner.
-- Token-submitted reviews may intentionally have a null user_id, but when a
-- user_id is present it must belong to the linked application.
create or replace function public.review_actor_owns_application(
  application_uuid uuid,
  actor_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select actor_uuid is not null
    and exists (
      select 1
      from public.program_applications application
      left join auth.users actor on actor.id = actor_uuid
      where application.id = application_uuid
        and (
          application.submitted_by = actor_uuid
          or (
            actor.email_confirmed_at is not null
            and lower(nullif(btrim(application.email), '')) =
              lower(nullif(btrim(actor.email), ''))
          )
        )
    );
$$;

revoke all privileges on function public.review_actor_owns_application(uuid, uuid)
from anon, authenticated, public;

update public.reviews review
set
  user_id = null,
  updated_at = now()
where review.source = 'participant'
  and review.application_id is not null
  and review.user_id is not null
  and public.review_actor_owns_application(review.application_id, review.user_id) is not true;

create or replace function public.prevent_invalid_participant_review_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'participant'
    and new.application_id is not null
    and new.user_id is not null
    and public.review_actor_owns_application(new.application_id, new.user_id) is not true
  then
    raise exception 'Participant review user must own the linked application.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_invalid_participant_review_user()
from anon, authenticated, public;

drop trigger if exists reviews_prevent_invalid_participant_user on public.reviews;
create trigger reviews_prevent_invalid_participant_user
before insert or update of source, application_id, user_id on public.reviews
for each row
execute function public.prevent_invalid_participant_review_user();
