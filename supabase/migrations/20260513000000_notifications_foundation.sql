do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('inApp', 'email', 'sms', 'kakao');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_event_status') then
    create type public.notification_event_status as enum ('pending', 'sent', 'failed', 'skipped');
  end if;
end $$;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  kakao_enabled boolean not null default false,
  program_deadline_enabled boolean not null default true,
  application_status_enabled boolean not null default true,
  announcement_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel public.notification_channel not null default 'inApp',
  status public.notification_event_status not null default 'pending',
  recipient_user_id uuid references public.profiles (id) on delete set null,
  recipient text,
  title text not null,
  body text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  delivered_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at);
create index if not exists user_notifications_user_read_idx
  on public.user_notifications (user_id, read_at);
create index if not exists notification_events_status_idx
  on public.notification_events (status, scheduled_for);
create index if not exists notification_events_recipient_user_idx
  on public.notification_events (recipient_user_id);
create index if not exists notification_events_event_type_idx
  on public.notification_events (event_type);

drop trigger if exists notification_preferences_set_updated_at
  on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists notification_events_set_updated_at
  on public.notification_events;
create trigger notification_events_set_updated_at
before update on public.notification_events
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.user_notifications enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "Users can read their notification preferences"
  on public.notification_preferences;
create policy "Users can read their notification preferences"
on public.notification_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their notification preferences"
  on public.notification_preferences;
create policy "Users can create their notification preferences"
on public.notification_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their notification preferences"
  on public.notification_preferences;
create policy "Users can update their notification preferences"
on public.notification_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can manage notification preferences"
  on public.notification_preferences;
create policy "Admins can manage notification preferences"
on public.notification_preferences for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their notifications"
  on public.user_notifications;
create policy "Users can read their notifications"
on public.user_notifications for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications"
  on public.user_notifications;
create policy "Users can update their notifications"
on public.user_notifications for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can manage user notifications"
  on public.user_notifications;
create policy "Admins can manage user notifications"
on public.user_notifications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage notification events"
  on public.notification_events;
create policy "Admins can manage notification events"
on public.notification_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
