-- Existing test-member data will be reset before launch. Guard new writes and
-- phone changes now without blocking unrelated updates to legacy invalid rows.

create or replace function public.enforce_member_mobile_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' and coalesce(new.phone, '') = '' then
    return new;
  end if;

  if new.phone is null or new.phone !~ '^010[0-9]{8}$' then
    raise exception using
      errcode = '23514',
      message = 'Invalid Korean mobile phone format.',
      hint = 'Store an 11-digit mobile number beginning with 010.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_mobile_phone on public.profiles;
create trigger profiles_enforce_mobile_phone
before insert or update of phone on public.profiles
for each row execute function public.enforce_member_mobile_phone();

drop trigger if exists program_applications_enforce_mobile_phone
  on public.program_applications;
create trigger program_applications_enforce_mobile_phone
before insert or update of phone on public.program_applications
for each row execute function public.enforce_member_mobile_phone();

comment on function public.enforce_member_mobile_phone() is
  'Rejects new or changed member phone values unless stored as 010 plus eight digits.';
