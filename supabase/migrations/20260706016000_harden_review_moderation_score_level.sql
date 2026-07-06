update public.review_moderation_checks
set
  risk_level = case
    when risk_score >= 50 then 'high'
    when risk_score >= 20 then 'medium'
    else 'low'
  end,
  updated_at = now()
where risk_level is distinct from case
  when risk_score >= 50 then 'high'
  when risk_score >= 20 then 'medium'
  else 'low'
end;

alter table public.review_moderation_checks
  drop constraint if exists review_moderation_checks_score_level_chk;

alter table public.review_moderation_checks
  add constraint review_moderation_checks_score_level_chk
  check (
    (risk_level = 'low' and risk_score between 0 and 19)
    or (risk_level = 'medium' and risk_score between 20 and 49)
    or (risk_level = 'high' and risk_score between 50 and 100)
  );
