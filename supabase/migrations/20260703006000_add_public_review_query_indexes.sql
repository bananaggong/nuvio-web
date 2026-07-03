create index if not exists reviews_public_published_idx
on public.reviews (published_at desc, created_at desc)
where status = 'published';

create index if not exists reviews_public_village_published_idx
on public.reviews (village_slug, published_at desc, created_at desc)
where status = 'published'
  and village_slug is not null;