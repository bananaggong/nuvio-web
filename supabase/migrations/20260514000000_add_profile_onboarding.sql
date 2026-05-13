alter table public.profiles
add column if not exists onboarding_intent text,
add column if not exists onboarding_completed_at timestamptz;

alter table public.announcements
alter column source_name set default '누비오';
