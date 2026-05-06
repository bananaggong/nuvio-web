create table if not exists host_social_connections (
  id uuid primary key default gen_random_uuid(),
  village_slug text not null,
  provider text not null default 'facebook',
  facebook_user_id text,
  page_id text,
  page_name text,
  page_access_token text,
  instagram_user_id text,
  instagram_username text,
  access_token text not null,
  token_expires_at timestamptz,
  permissions jsonb not null default '[]'::jsonb,
  status text not null default 'connected',
  last_synced_at timestamptz,
  last_sync_error text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists host_social_connections_village_provider_idx
  on host_social_connections (village_slug, provider);

create index if not exists host_social_connections_instagram_user_idx
  on host_social_connections (instagram_user_id);
