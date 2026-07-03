create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  scope text not null,
  identity_hash text not null,
  window_start timestamptz not null,
  reset_at timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_rate_limits_reset_at_idx
  on public.api_rate_limits(reset_at);
create index if not exists api_rate_limits_scope_reset_idx
  on public.api_rate_limits(scope, reset_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'api_rate_limits_count_chk'
      and conrelid = 'public.api_rate_limits'::regclass
  ) then
    alter table public.api_rate_limits
      add constraint api_rate_limits_count_chk
      check (count > 0);
  end if;
end $$;

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from anon, authenticated, public;