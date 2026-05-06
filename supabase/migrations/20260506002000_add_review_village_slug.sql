alter table public.reviews
  add column if not exists village_slug text;

create index if not exists reviews_village_slug_idx
  on public.reviews(village_slug);
