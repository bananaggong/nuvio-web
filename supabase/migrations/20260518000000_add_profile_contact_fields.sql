alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists address text;
