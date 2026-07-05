-- Evaluate review moderation risk before a review is published so high-risk
-- content cannot briefly enter the published state before the after-write
-- moderation/visibility-hold triggers run.
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
  flag_values text[] := array[]::text[];
  score integer := 0;
  link_count integer := 0;
  image_count integer := 0;
begin
  content := coalesce(review_title, '') || ' ' || coalesce(review_excerpt, '') || ' ' || coalesce(review_body, '');
  image_count := case
    when jsonb_typeof(coalesce(review_images, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(review_images, '[]'::jsonb))
    else 0
  end;

  if content ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}' then
    flag_values := array_append(flag_values, 'privacy_email');
    score := score + 40;
  end if;

  if content ~* '(^|[^0-9])01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4}([^0-9]|$)' then
    flag_values := array_append(flag_values, 'privacy_phone');
    score := score + 40;
  end if;

  link_count := (
    select count(*)::integer
    from regexp_matches(content, '(https?://|www[.])', 'gi')
  );
  if link_count > 0 then
    flag_values := array_append(flag_values, 'external_link');
    score := score + least(30, link_count * 15);
  end if;

  if char_length(btrim(coalesce(review_body, ''))) < 30 then
    flag_values := array_append(flag_values, 'short_content');
    score := score + 10;
  end if;

  if content ~ '[^[:space:]]{80,}' then
    flag_values := array_append(flag_values, 'long_unbroken_text');
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
    '[]'::jsonb,
    jsonb_build_object(
      'source', 'database_trigger',
      'characterCount', char_length(content),
      'imageCount', image_count,
      'linkCount', link_count
    );
end;
$$;

revoke all privileges on function public.review_moderation_analysis(text, text, text, jsonb) from anon, authenticated, public;

create or replace function public.sync_review_moderation_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  analysis record;
begin
  select *
  into analysis
  from public.review_moderation_analysis(new.title, new.excerpt, new.body, new.images)
  limit 1;

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
    analysis.risk_level,
    analysis.risk_score,
    analysis.flags,
    analysis.matched_terms,
    analysis.metadata,
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

revoke all privileges on function public.sync_review_moderation_check() from anon, authenticated, public;

create or replace function public.prevent_review_publish_with_active_hold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  analysis record;
begin
  if new.status::text = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    if exists (
      select 1
      from public.review_visibility_holds hold
      where hold.review_id = new.id
        and hold.status = 'active'
    ) then
      raise exception 'Active review visibility holds must be released before publishing.'
        using errcode = '23514';
    end if;

    select *
    into analysis
    from public.review_moderation_analysis(new.title, new.excerpt, new.body, new.images)
    limit 1;

    if analysis.risk_level = 'high' then
      raise exception 'High-risk review content must be moderated before publishing.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_review_publish_with_active_hold() from anon, authenticated, public;