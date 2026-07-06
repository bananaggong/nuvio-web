-- Keep immutable review content-version snapshots inside the same public text
-- and provenance bounds as the current review row.
drop trigger if exists review_content_versions_prevent_mutation
on public.review_content_versions;

update public.review_content_versions version
set
  author_name = left(
    case
      when char_length(btrim(coalesce(version.author_name, ''))) >= 1 then btrim(version.author_name)
      when char_length(btrim(coalesce(review.author_name, ''))) >= 1 then btrim(review.author_name)
      else 'Anonymous'
    end,
    120
  ),
  change_source = coalesce(
    nullif(
      left(
        regexp_replace(
          btrim(coalesce(version.change_source, 'database_trigger')),
          '[^A-Za-z0-9_.:-]',
          '_',
          'g'
        ),
        80
      ),
      ''
    ),
    'database_trigger'
  )
from public.reviews review
where review.id = version.review_id
  and (
    char_length(btrim(coalesce(version.author_name, ''))) < 1
    or char_length(btrim(coalesce(version.author_name, ''))) > 120
    or version.author_name is distinct from btrim(version.author_name)
    or version.change_source !~ '^[A-Za-z0-9_.:-]{1,80}$'
  );

do $$
begin
  alter table public.review_content_versions
    drop constraint if exists review_content_versions_author_name_length_chk;

  alter table public.review_content_versions
    add constraint review_content_versions_author_name_length_chk
    check (char_length(btrim(author_name)) between 1 and 120);

  alter table public.review_content_versions
    drop constraint if exists review_content_versions_change_source_shape_chk;

  alter table public.review_content_versions
    add constraint review_content_versions_change_source_shape_chk
    check (change_source ~ '^[A-Za-z0-9_.:-]{1,80}$');
end $$;

create trigger review_content_versions_prevent_mutation
before insert or update or delete
on public.review_content_versions
for each row
execute function public.prevent_review_content_version_mutation();
