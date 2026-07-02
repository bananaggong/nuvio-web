alter type public.notification_channel add value if not exists 'browserPush';

alter table public.notification_preferences
  add column if not exists browser_push_enabled boolean not null default true;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

drop trigger if exists push_subscriptions_set_updated_at
  on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read their push subscriptions"
  on public.push_subscriptions;
create policy "Users can read their push subscriptions"
on public.push_subscriptions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their push subscriptions"
  on public.push_subscriptions;
create policy "Users can create their push subscriptions"
on public.push_subscriptions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their push subscriptions"
  on public.push_subscriptions;
create policy "Users can update their push subscriptions"
on public.push_subscriptions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their push subscriptions"
  on public.push_subscriptions;
create policy "Users can delete their push subscriptions"
on public.push_subscriptions for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can manage push subscriptions"
  on public.push_subscriptions;
create policy "Admins can manage push subscriptions"
on public.push_subscriptions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
