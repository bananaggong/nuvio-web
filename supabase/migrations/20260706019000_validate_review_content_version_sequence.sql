create or replace function public.validate_review_content_version_sequence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_version integer;
begin
  select coalesce(max(version), 0) + 1
  into expected_version
  from public.review_content_versions
  where review_id = new.review_id;

  if new.version <> expected_version then
    raise exception 'Review content version must be the next sequential version.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.validate_review_content_version_sequence() from anon, authenticated, public;

drop trigger if exists review_content_versions_validate_sequence on public.review_content_versions;
create trigger review_content_versions_validate_sequence
before insert on public.review_content_versions
for each row
execute function public.validate_review_content_version_sequence();
