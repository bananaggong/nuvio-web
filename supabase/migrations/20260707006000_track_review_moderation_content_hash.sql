create or replace function public.review_moderation_content_hash(
  review_title text,
  review_excerpt text,
  review_body text,
  review_images jsonb default '[]'::jsonb
)
returns text
language sql
immutable
set search_path = public
as $$
  select md5(
    coalesce(review_title, '')
    || chr(31)
    || coalesce(review_excerpt, '')
    || chr(31)
    || coalesce(review_body, '')
    || chr(31)
    || coalesce(review_images, '[]'::jsonb)::text
  );
$$;

revoke all privileges on function public.review_moderation_content_hash(text, text, text, jsonb)
from anon, authenticated, public;

create or replace function public.review_moderation_analysis(
  review_title text,
  review_excerpt text,
  review_body text,
  review_images jsonb default '[]'::jsonb
)
returns table (
  risk_level text,
  risk_score integer,
  flags jsonb,
  matched_terms jsonb,
  metadata jsonb
)
language plpgsql
immutable
set search_path = public
as $$
declare
  content text;
  body_text text;
  flag_values text[] := array[]::text[];
  matched_values text[] := array[]::text[];
  score integer := 0;
  link_count integer := 0;
  image_count integer := 0;
  match_parts text[];
  match_value text;
  matched_text text;
  digits text;
  local_part text;
  domain_part text;
begin
  body_text := coalesce(review_body, '');
  content := coalesce(review_title, '') || ' ' || coalesce(review_excerpt, '') || ' ' || body_text;
  image_count := case
    when jsonb_typeof(coalesce(review_images, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(review_images, '[]'::jsonb))
    else 0
  end;

  if content ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}' then
    flag_values := array_append(flag_values, 'privacy_email');
    score := score + 40;

    for match_parts in
      select regexp_matches(content, '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}', 'gi')
    loop
      exit when coalesce(array_length(matched_values, 1), 0) >= 3;
      match_value := lower(match_parts[1]);
      local_part := split_part(match_value, '@', 1);
      domain_part := split_part(match_value, '@', 2);
      matched_text := coalesce(nullif(left(local_part, 2), ''), '*') || '***@' || domain_part;
      if not matched_text = any(matched_values) then
        matched_values := array_append(matched_values, matched_text);
      end if;
    end loop;
  end if;

  if content ~* '(^|[^0-9])(01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4})([^0-9]|$)' then
    flag_values := array_append(flag_values, 'privacy_phone');
    score := score + 40;

    for match_parts in
      select regexp_matches(content, '(^|[^0-9])(01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4})([^0-9]|$)', 'g')
    loop
      exit when coalesce(array_length(matched_values, 1), 0) >= 6;
      digits := regexp_replace(match_parts[2], '[^0-9]', '', 'g');
      matched_text := case
        when char_length(digits) >= 7 then left(digits, 3) || '****' || right(digits, 4)
        else '***'
      end;
      if not matched_text = any(matched_values) then
        matched_values := array_append(matched_values, matched_text);
      end if;
    end loop;
  end if;

  link_count := (
    select count(*)::integer
    from regexp_matches(content, '(https?://[^[:space:]]+|www[.][^[:space:]]+)', 'gi')
  );
  if link_count > 0 then
    flag_values := array_append(flag_values, 'external_link');
    score := score + least(30, link_count * 15);

    for match_parts in
      select regexp_matches(content, '(https?://[^[:space:]]+|www[.][^[:space:]]+)', 'gi')
    loop
      exit when coalesce(array_length(matched_values, 1), 0) >= 9;
      matched_text := regexp_replace(match_parts[1], '^(https?://)?([^/[:space:]]+).*$','\2/...', 'i');
      if not matched_text = any(matched_values) then
        matched_values := array_append(matched_values, matched_text);
      end if;
    end loop;
  end if;

  if link_count >= 3 then
    flag_values := array_append(flag_values, 'excessive_links');
    score := score + 20;
  end if;

  if content ~ '(^|[[:space:]])@[A-Za-z0-9_.]{3,30}' then
    flag_values := array_append(flag_values, 'social_handle');
    score := score + 15;

    for match_parts in
      select regexp_matches(content, '(^|[[:space:]])(@[A-Za-z0-9_.]{3,30})', 'g')
    loop
      exit when coalesce(array_length(matched_values, 1), 0) >= 10;
      matched_text := match_parts[2];
      if not matched_text = any(matched_values) then
        matched_values := array_append(matched_values, matched_text);
      end if;
    end loop;
  end if;

  if char_length(btrim(body_text)) < 30 then
    flag_values := array_append(flag_values, 'short_content');
    score := score + 10;
  end if;

  if content ~ '[^[:space:]]{80,}' then
    flag_values := array_append(flag_values, 'long_unbroken_text');
    score := score + 10;
  end if;

  if content ~ '(.)\1{7,}' then
    flag_values := array_append(flag_values, 'repetitive_text');
    score := score + 15;
  end if;

  if image_count > 0 and char_length(btrim(body_text)) < 50 then
    flag_values := array_append(flag_values, 'image_heavy_short_text');
    score := score + 10;
  end if;

  score := least(score, 100);

  return query
  select
    case
      when score >= 50 then 'high'
      when score >= 20 then 'medium'
      else 'low'
    end,
    score,
    to_jsonb(flag_values),
    to_jsonb(coalesce(matched_values[1:10], array[]::text[])),
    jsonb_build_object(
      'source', 'database_trigger',
      'checkedVersion', 2,
      'contentHash', public.review_moderation_content_hash(
        review_title,
        review_excerpt,
        review_body,
        review_images
      ),
      'characterCount', char_length(content),
      'imageCount', image_count,
      'linkCount', link_count
    );
end;
$$;

revoke all privileges on function public.review_moderation_analysis(text, text, text, jsonb)
from anon, authenticated, public;

create or replace function public.normalize_review_moderation_check_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_row record;
begin
  select title, excerpt, body, images
  into review_row
  from public.reviews
  where id = new.review_id;

  if not found then
    return new;
  end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'contentHash',
      public.review_moderation_content_hash(
        review_row.title,
        review_row.excerpt,
        review_row.body,
        review_row.images
      )
    );

  return new;
end;
$$;

revoke all privileges on function public.normalize_review_moderation_check_metadata()
from anon, authenticated, public;

drop trigger if exists review_moderation_checks_normalize_metadata
on public.review_moderation_checks;
create trigger review_moderation_checks_normalize_metadata
before insert or update of review_id, metadata
on public.review_moderation_checks
for each row
execute function public.normalize_review_moderation_check_metadata();

create or replace function public.review_moderation_check_is_current(
  review_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews review
    inner join public.review_moderation_checks moderation
      on moderation.review_id = review.id
    where review.id = review_uuid
      and moderation.risk_level in ('low', 'medium')
      and moderation.metadata ->> 'contentHash' =
        public.review_moderation_content_hash(
          review.title,
          review.excerpt,
          review.body,
          review.images
        )
  );
$$;

revoke all privileges on function public.review_moderation_check_is_current(uuid)
from anon, authenticated, public;

create or replace function public.review_is_publicly_visible(review_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews review
    where review.id = review_uuid
      and review.status = 'published'
      and review.published_at is not null
      and review.published_at <= now()
      and public.review_moderation_check_is_current(review.id)
      and (
        review.source <> 'participant'
        or public.application_is_review_eligible(review.application_id)
      )
      and (
        review.program_id is null
        or exists (
          select 1
          from public.programs program
          where program.id = review.program_id
            and program.published_at is not null
        )
      )
      and not exists (
        select 1
        from public.review_visibility_holds hold
        where hold.review_id = review.id
          and hold.status = 'active'
      )
  );
$$;

revoke all privileges on function public.review_is_publicly_visible(uuid)
from anon, authenticated, public;

do $$
declare
  review_row record;
  analysis record;
begin
  for review_row in
    select id, title, excerpt, body, images
    from public.reviews
  loop
    select *
    into analysis
    from public.review_moderation_analysis(
      review_row.title,
      review_row.excerpt,
      review_row.body,
      review_row.images
    )
    limit 1;

    if exists (
      select 1
      from public.review_moderation_checks existing
      where existing.review_id = review_row.id
    ) then
      perform set_config('app.review_moderation_write_allowed', 'true', true);

      update public.review_moderation_checks
      set
        risk_level = analysis.risk_level,
        risk_score = analysis.risk_score,
        flags = analysis.flags,
        matched_terms = analysis.matched_terms,
        metadata = analysis.metadata,
        checked_by = null,
        checked_at = now(),
        updated_at = now()
      where review_id = review_row.id;
    else
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
        review_row.id,
        analysis.risk_level,
        analysis.risk_score,
        analysis.flags,
        analysis.matched_terms,
        analysis.metadata,
        now(),
        now()
      );
    end if;
  end loop;
end $$;

delete from public.review_helpful_votes vote
where public.review_is_publicly_visible(vote.review_id) is not true;
