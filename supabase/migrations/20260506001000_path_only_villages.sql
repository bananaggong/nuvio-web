drop index if exists public.villages_subdomain_idx;
drop index if exists public.villages_custom_domain_idx;

alter table public.villages
  drop column if exists subdomain,
  drop column if exists custom_domain;
