create table if not exists public.review_moderation_checks (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  risk_level text not null default 'low',
  risk_score integer not null default 0,
  flags jsonb not null default '[]'::jsonb,
  matched_terms jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists review_moderation_checks_review_id_unique_idx
  on public.review_moderation_checks(review_id);
create index if not exists review_moderation_checks_risk_level_idx
  on public.review_moderation_checks(risk_level);
create index if not exists review_moderation_checks_checked_at_idx
  on public.review_moderation_checks(checked_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_moderation_checks_risk_level_chk'
      and conrelid = 'public.review_moderation_checks'::regclass
  ) then
    alter table public.review_moderation_checks
      add constraint review_moderation_checks_risk_level_chk
      check (risk_level in ('low', 'medium', 'high'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_moderation_checks_risk_score_chk'
      and conrelid = 'public.review_moderation_checks'::regclass
  ) then
    alter table public.review_moderation_checks
      add constraint review_moderation_checks_risk_score_chk
      check (risk_score between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_moderation_checks_json_shape_chk'
      and conrelid = 'public.review_moderation_checks'::regclass
  ) then
    alter table public.review_moderation_checks
      add constraint review_moderation_checks_json_shape_chk
      check (
        jsonb_typeof(flags) = 'array'
        and jsonb_typeof(matched_terms) = 'array'
        and jsonb_typeof(metadata) = 'object'
      );
  end if;
end $$;

create or replace function public.sync_review_moderation_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  content text;
  flags text[] := array[]::text[];
  risk_score integer := 0;
  risk_level text := 'low';
  link_count integer := 0;
  image_count integer := 0;
begin
  content := coalesce(new.title, '') || ' ' || coalesce(new.excerpt, '') || ' ' || coalesce(new.body, '');
  image_count := coalesce(jsonb_array_length(new.images), 0);

  if content ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}' then
    flags := array_append(flags, 'privacy_email');
    risk_score := risk_score + 40;
  end if;

  if content ~* '(^|[^0-9])01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4}([^0-9]|$)' then
    flags := array_append(flags, 'privacy_phone');
    risk_score := risk_score + 40;
  end if;

  link_count := (
    select count(*)::integer
    from regexp_matches(content, '(https?://|www[.])', 'gi')
  );
  if link_count > 0 then
    flags := array_append(flags, 'external_link');
    risk_score := risk_score + least(30, link_count * 15);
  end if;

  if char_length(btrim(coalesce(new.body, ''))) < 30 then
    flags := array_append(flags, 'short_content');
    risk_score := risk_score + 10;
  end if;

  if content ~ '[^[:space:]]{80,}' then
    flags := array_append(flags, 'long_unbroken_text');
    risk_score := risk_score + 10;
  end if;

  risk_score := least(risk_score, 100);
  risk_level := case
    when risk_score >= 50 then 'high'
    when risk_score >= 20 then 'medium'
    else 'low'
  end;

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
    risk_level,
    risk_score,
    to_jsonb(flags),
    '[]'::jsonb,
    jsonb_build_object(
      'source', 'database_trigger',
      'characterCount', char_length(content),
      'imageCount', image_count,
      'linkCount', link_count
    ),
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

drop trigger if exists reviews_sync_moderation_check_after_write on public.reviews;
create trigger reviews_sync_moderation_check_after_write
after insert or update of title, excerpt, body, images, status, source
on public.reviews
for each row
execute function public.sync_review_moderation_check();

update public.reviews
set body = body;

insert into public.review_moderation_checks (
  review_id,
  risk_level,
  risk_score,
  flags,
  matched_terms,
  metadata,
  checked_at,
  updated_at
)
select
  review.id,
  'low',
  0,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object('source', 'migration_backfill'),
  now(),
  now()
from public.reviews review
on conflict (review_id) do nothing;

alter table public.review_moderation_checks enable row level security;

drop policy if exists "Host members can manage review moderation checks" on public.review_moderation_checks;
create policy "Host members can manage review moderation checks"
on public.review_moderation_checks for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.reviews review
    where review.id = review_id
      and (
        (review.village_slug is not null and public.current_user_can_edit_village_slug(review.village_slug))
        or (review.program_id is not null and public.current_user_can_edit_program(review.program_id))
      )
  )
);

grant select, insert, update, delete on table public.review_moderation_checks to authenticated;