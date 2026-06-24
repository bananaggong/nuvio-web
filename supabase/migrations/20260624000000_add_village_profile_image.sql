alter table public.villages
  add column if not exists profile_image_url text not null default '';
