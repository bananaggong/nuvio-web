-- Re-run high-risk moderation when content on an already-published review changes.
-- Active holds still block publishing transitions, while content updates are
-- checked against the same high-risk analysis before they are saved.
create or replace function public.prevent_review_publish_with_active_hold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  analysis record;
  is_publish_transition boolean;
  needs_content_analysis boolean;
begin
  if new.status::text = 'published' then
    is_publish_transition := tg_op = 'INSERT'
      or old.status is distinct from new.status;

    needs_content_analysis := is_publish_transition
      or old.title is distinct from new.title
      or old.excerpt is distinct from new.excerpt
      or old.body is distinct from new.body
      or old.images is distinct from new.images;

    if is_publish_transition and exists (
      select 1
      from public.review_visibility_holds hold
      where hold.review_id = new.id
        and hold.status = 'active'
    ) then
      raise exception 'Active review visibility holds must be released before publishing.'
        using errcode = '23514';
    end if;

    if needs_content_analysis then
      select *
      into analysis
      from public.review_moderation_analysis(new.title, new.excerpt, new.body, new.images)
      limit 1;

      if analysis.risk_level = 'high' then
        raise exception 'High-risk review content must be moderated before publishing.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_review_publish_with_active_hold() from anon, authenticated, public;
