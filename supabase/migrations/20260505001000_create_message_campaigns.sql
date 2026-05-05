create table if not exists public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_key text not null,
  channel public.message_channel not null default 'email',
  target_status text not null default 'all',
  scheduled_at timestamptz,
  status public.message_delivery_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_campaigns_status_idx
  on public.message_campaigns(status);

create index if not exists message_campaigns_scheduled_at_idx
  on public.message_campaigns(scheduled_at);
