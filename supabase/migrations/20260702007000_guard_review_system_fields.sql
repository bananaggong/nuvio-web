create or replace function public.prevent_review_system_field_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.likes is distinct from old.likes
    or new.comments is distinct from old.comments then
    if current_setting('app.review_counter_write_allowed', true) is distinct from 'true' then
      raise exception 'Review counters are system managed.'
        using errcode = '42501';
    end if;

    perform set_config('app.review_counter_write_allowed', '', true);
  end if;

  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
    or new.source is distinct from old.source then
    raise exception 'Review identity fields are immutable.'
      using errcode = '42501';
  end if;

  if old.source = 'participant' then
    if new.user_id is distinct from old.user_id
      or new.application_id is distinct from old.application_id
      or new.program_id is distinct from old.program_id
      or new.program_run_id is distinct from old.program_run_id
      or new.village_slug is distinct from old.village_slug
      or new.author_name is distinct from old.author_name
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Participant review ownership and attribution fields are immutable.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_review_system_field_mutation() from public;

drop trigger if exists reviews_prevent_system_field_mutation on public.reviews;
create trigger reviews_prevent_system_field_mutation
before update on public.reviews
for each row
execute function public.prevent_review_system_field_mutation();

create or replace function public.recalculate_review_helpful_count(review_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if review_uuid is null then
    return;
  end if;

  perform set_config('app.review_counter_write_allowed', 'true', true);

  update public.reviews review
  set
    likes = coalesce((
      select count(*)::integer
      from public.review_helpful_votes vote
      where vote.review_id = review_uuid
    ), 0),
    updated_at = now()
  where review.id = review_uuid;
end;
$$;

create or replace function public.recalculate_review_host_reply_count(review_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if review_uuid is null then
    return;
  end if;

  perform set_config('app.review_counter_write_allowed', 'true', true);

  update public.reviews review
  set
    comments = coalesce((
      select count(*)::integer
      from public.review_host_replies reply
      where reply.review_id = review_uuid
        and reply.status = 'published'
    ), 0),
    updated_at = now()
  where review.id = review_uuid;
end;
$$;

revoke all on function public.recalculate_review_helpful_count(uuid) from public;
revoke all on function public.recalculate_review_host_reply_count(uuid) from public;