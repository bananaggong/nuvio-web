create or replace function public.prevent_deleted_review_public_content_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status::text = 'deleted'
    and new.status::text = 'deleted'
    and (
      new.application_id is distinct from old.application_id
      or new.program_id is distinct from old.program_id
      or new.program_run_id is distinct from old.program_run_id
      or new.village_slug is distinct from old.village_slug
      or new.user_id is distinct from old.user_id
      or new.title is distinct from old.title
      or new.category is distinct from old.category
      or new.author_name is distinct from old.author_name
      or new.excerpt is distinct from old.excerpt
      or new.body is distinct from old.body
      or new.images is distinct from old.images
      or new.rating is distinct from old.rating
      or new.badge is distinct from old.badge
      or new.source is distinct from old.source
      or new.submitted_at is distinct from old.submitted_at
      or new.published_at is distinct from old.published_at
    )
  then
    raise exception 'Deleted review public content cannot be changed.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.prevent_deleted_review_public_content_mutation() from anon, authenticated, public;

drop trigger if exists reviews_prevent_deleted_public_content_mutation on public.reviews;
create trigger reviews_prevent_deleted_public_content_mutation
before update on public.reviews
for each row
execute function public.prevent_deleted_review_public_content_mutation();
