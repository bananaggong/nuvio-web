-- Keep the database-side publish guard aligned with the application moderation rules.
-- The before-publish trigger calls review_moderation_analysis(), so it must score
-- the same high-risk signals as the application service before content is saved.
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
      'checkedVersion', 1,
      'characterCount', char_length(content),
      'imageCount', image_count,
      'linkCount', link_count
    );
end;
$$;

revoke all privileges on function public.review_moderation_analysis(text, text, text, jsonb) from anon, authenticated, public;

-- Recalculate stored checks through the existing guarded table so the visibility
-- hold trigger activates or releases high-risk holds under the new scoring rules.
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

    perform set_config('app.review_moderation_write_allowed', 'true', true);

    if exists (
      select 1
      from public.review_moderation_checks existing
      where existing.review_id = review_row.id
    ) then
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
