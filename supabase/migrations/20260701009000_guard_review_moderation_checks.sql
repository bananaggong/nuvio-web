create or replace function public.sync_review_moderation_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  content text;
  flags text[] := array[]::text[];
  risk_score integer := 0;
  risk_level text := 'low';
  link_count integer := 0;
  image_count integer := 0;
begin
  content := coalesce(new.title, '') || ' ' || coalesce(new.excerpt, '') || ' ' || coalesce(new.body, '');
  image_count := coalesce(jsonb_array_length(new.images), 0);

  if content ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}' then
    flags := array_append(flags, 'privacy_email');
    risk_score := risk_score + 40;
  end if;

  if content ~* '(^|[^0-9])01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4}([^0-9]|$)' then
    flags := array_append(flags, 'privacy_phone');
    risk_score := risk_score + 40;
  end if;

  link_count := (
    select count(*)::integer
    from regexp_matches(content, '(https?://|www[.])', 'gi')
  );
  if link_count > 0 then
    flags := array_append(flags, 'external_link');
    risk_score := risk_score + least(30, link_count * 15);
  end if;

  if char_length(btrim(coalesce(new.body, ''))) < 30 then
    flags := array_append(flags, 'short_content');
    risk_score := risk_score + 10;
  end if;

  if content ~ '[^[:space:]]{80,}' then
    flags := array_append(flags, 'long_unbroken_text');
    risk_score := risk_score + 10;
  end if;

  risk_score := least(risk_score, 100);
  risk_level := case
    when risk_score >= 50 then 'high'
    when risk_score >= 20 then 'medium'
    else 'low'
  end;

  perform set_config('app.review_moderation_write_allowed', 'true', true);

  insert into public.review_moderation_checks (
    review_id,
    risk_level,
    risk_score,
    flags,
    matched_terms,
    metadata,
    checked_at,
    updated_at
  ) values (
    new.id,
    risk_level,
    risk_score,
    to_jsonb(flags),
    '[]'::jsonb,
    jsonb_build_object(
      'source', 'database_trigger',
      'characterCount', char_length(content),
      'imageCount', image_count,
      'linkCount', link_count
    ),
    now(),
    now()
  )
  on conflict (review_id) do update set
    risk_level = excluded.risk_level,
    risk_score = excluded.risk_score,
    flags = excluded.flags,
    matched_terms = excluded.matched_terms,
    metadata = excluded.metadata,
    checked_by = null,
    checked_at = now(),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_review_moderation_check() from public;

create or replace function public.prevent_review_moderation_check_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if current_setting('app.review_moderation_write_allowed', true) is distinct from 'true' then
      raise exception 'Review moderation checks can only be written by review write triggers or the application service.'
        using errcode = '42501';
    end if;

    perform set_config('app.review_moderation_write_allowed', '', true);
    return new;
  end if;

  if current_setting('app.review_hard_delete_allowed', true) = 'true' then
    return old;
  end if;

  raise exception 'Review moderation checks are system managed and cannot be deleted directly.'
    using errcode = '42501';
end;
$$;

revoke all on function public.prevent_review_moderation_check_mutation() from public;

drop trigger if exists review_moderation_checks_prevent_hard_delete on public.review_moderation_checks;
drop trigger if exists review_moderation_checks_prevent_mutation on public.review_moderation_checks;
create trigger review_moderation_checks_prevent_mutation
before insert or update or delete
on public.review_moderation_checks
for each row
execute function public.prevent_review_moderation_check_mutation();

drop policy if exists "Host members can manage review moderation checks" on public.review_moderation_checks;
drop policy if exists "Host members can read review moderation checks" on public.review_moderation_checks;
create policy "Host members can read review moderation checks"
on public.review_moderation_checks for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = public.review_moderation_checks.review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

revoke insert, update, delete on table public.review_moderation_checks from authenticated;
grant select on table public.review_moderation_checks to authenticated;