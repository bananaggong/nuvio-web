create or replace function public.sync_review_moderation_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  analysis record;
begin
  if new.status::text = 'deleted' then
    perform set_config('app.review_hard_delete_allowed', 'true', true);

    delete from public.review_moderation_checks moderation
    where moderation.review_id = new.id;

    return new;
  end if;

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

revoke all privileges on function public.sync_review_moderation_check()
from anon, authenticated, public;
