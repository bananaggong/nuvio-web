-- Bound moderation JSON arrays so automated risk decisions stay predictable.
create or replace function public.review_json_text_array_within(
  items jsonb,
  max_items integer,
  max_text_length integer
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(items) is distinct from 'array' then false
    when jsonb_array_length(items) > max_items then false
    else not exists (
      select 1
      from jsonb_array_elements(items) as item(value)
      where jsonb_typeof(item.value) is distinct from 'string'
        or char_length(btrim(item.value #>> '{}')) < 1
        or char_length(item.value #>> '{}') > max_text_length
    )
  end;
$$;

revoke all privileges on function public.review_json_text_array_within(jsonb, integer, integer)
from anon, authenticated, public;

drop trigger if exists review_moderation_checks_prevent_mutation
on public.review_moderation_checks;

update public.review_moderation_checks check_row
set
  flags = coalesce(
    (
      select jsonb_agg(to_jsonb(left(btrim(item.value #>> '{}'), 80)) order by item.position)
      from jsonb_array_elements(
        case
          when jsonb_typeof(check_row.flags) = 'array' then check_row.flags
          else '[]'::jsonb
        end
      ) with ordinality as item(value, position)
      where item.position <= 20
        and jsonb_typeof(item.value) = 'string'
        and btrim(item.value #>> '{}') <> ''
    ),
    '[]'::jsonb
  ),
  matched_terms = coalesce(
    (
      select jsonb_agg(to_jsonb(left(btrim(item.value #>> '{}'), 200)) order by item.position)
      from jsonb_array_elements(
        case
          when jsonb_typeof(check_row.matched_terms) = 'array' then check_row.matched_terms
          else '[]'::jsonb
        end
      ) with ordinality as item(value, position)
      where item.position <= 10
        and jsonb_typeof(item.value) = 'string'
        and btrim(item.value #>> '{}') <> ''
    ),
    '[]'::jsonb
  ),
  metadata = case
    when jsonb_typeof(check_row.metadata) = 'object' then check_row.metadata
    else '{}'::jsonb
  end,
  updated_at = now()
where public.review_json_text_array_within(check_row.flags, 20, 80) is not true
  or public.review_json_text_array_within(check_row.matched_terms, 10, 200) is not true
  or jsonb_typeof(check_row.metadata) is distinct from 'object';

do $$
begin
  alter table public.review_moderation_checks
    drop constraint if exists review_moderation_checks_json_shape_chk;

  alter table public.review_moderation_checks
    add constraint review_moderation_checks_json_shape_chk
    check (
      public.review_json_text_array_within(flags, 20, 80)
      and public.review_json_text_array_within(matched_terms, 10, 200)
      and jsonb_typeof(metadata) = 'object'
    );
end $$;

create trigger review_moderation_checks_prevent_mutation
before insert or update or delete
on public.review_moderation_checks
for each row
execute function public.prevent_review_moderation_check_mutation();
