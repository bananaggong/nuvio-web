update public.reviews
set published_at = coalesce(published_at, created_at, now())
where status = 'published'
  and published_at is null;

create index if not exists reviews_public_cursor_idx
on public.reviews (published_at desc, created_at desc, id desc)
where status = 'published';

create index if not exists reviews_public_village_cursor_idx
on public.reviews (village_slug, published_at desc, created_at desc, id desc)
where status = 'published' and village_slug is not null;