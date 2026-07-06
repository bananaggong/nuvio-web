-- Bound short public review text fields that are shown in cards, detail pages,
-- host moderation panels, and structured data. Main content fields already have
-- length checks; author_name and badge need the same DB-level guardrails.
update public.reviews
set
  author_name = left(
    case
      when char_length(btrim(coalesce(author_name, ''))) >= 1 then btrim(author_name)
      else U&'\C775\BA85'
    end,
    120
  ),
  badge = nullif(left(btrim(coalesce(badge, '')), 80), '')
where char_length(btrim(coalesce(author_name, ''))) < 1
  or char_length(btrim(coalesce(author_name, ''))) > 120
  or badge is not null
    and (
      char_length(btrim(badge)) < 1
      or char_length(btrim(badge)) > 80
      or badge is distinct from btrim(badge)
    );

alter table public.reviews
  drop constraint if exists reviews_author_name_length_chk;

alter table public.reviews
  add constraint reviews_author_name_length_chk
  check (char_length(btrim(author_name)) between 1 and 120);

alter table public.reviews
  drop constraint if exists reviews_badge_length_chk;

alter table public.reviews
  add constraint reviews_badge_length_chk
  check (badge is null or char_length(btrim(badge)) between 1 and 80);
