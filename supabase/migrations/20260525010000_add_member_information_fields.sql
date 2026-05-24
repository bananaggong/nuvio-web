alter table public.profiles
  add column if not exists full_name text,
  add column if not exists login_id text,
  add column if not exists address_detail text,
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists payment_method text,
  add column if not exists refund_bank text,
  add column if not exists refund_account text;

update public.profiles
set login_id = split_part(email, '@', 1)
where coalesce(login_id, '') = ''
  and coalesce(email, '') <> '';

do $$
begin
  alter table public.profiles
    add constraint profiles_gender_check
    check (gender is null or gender in ('female', 'male', 'neutral'));
exception
  when duplicate_object then null;
end $$;

create index if not exists profiles_login_id_idx
  on public.profiles (login_id);
