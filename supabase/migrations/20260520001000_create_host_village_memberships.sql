do $$
begin
  create type public.host_village_role as enum (
    'owner',
    'manager',
    'editor',
    'viewer'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.host_village_grant_status as enum (
    'pending',
    'active',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.host_village_memberships (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  account_email text not null,
  role public.host_village_role not null default 'owner',
  status public.host_village_grant_status not null default 'pending',
  granted_by uuid references public.profiles (id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists host_village_memberships_village_account_email_idx
  on public.host_village_memberships (village_id, account_email);

create index if not exists host_village_memberships_village_id_idx
  on public.host_village_memberships (village_id);

create index if not exists host_village_memberships_user_id_idx
  on public.host_village_memberships (user_id);

create index if not exists host_village_memberships_status_idx
  on public.host_village_memberships (status);

drop trigger if exists host_village_memberships_set_updated_at
  on public.host_village_memberships;

create trigger host_village_memberships_set_updated_at
before update on public.host_village_memberships
for each row execute function public.set_updated_at();

alter table public.host_village_memberships enable row level security;

drop policy if exists "Users can read own host village memberships"
  on public.host_village_memberships;
create policy "Users can read own host village memberships"
on public.host_village_memberships for select
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Admins can manage host village memberships"
  on public.host_village_memberships;
create policy "Admins can manage host village memberships"
on public.host_village_memberships for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.villages (
  id,
  slug,
  name,
  region,
  city,
  tagline,
  summary,
  description,
  hero_image_url,
  logo_text,
  brand_color,
  accent_color,
  instagram_url,
  kakao_url,
  contact_email,
  contact_phone,
  address,
  program_ids,
  links,
  sections,
  published_at,
  created_at,
  updated_at
) values (
  '33333333-4444-4555-8666-777777777777',
  'boseong',
  '전체차LAB',
  '전라남도',
  '보성군',
  '차를 매개로 청년의 삶과 지역의 미래를 연결합니다.',
  '전체차LAB은 보성 회천면을 기반으로 공간, 체류, 차문화, 콘텐츠를 운영하는 청년마을입니다.',
  '청년단체 그린티모시레가 운영하는 보성 로컬마을입니다. 보성의 녹차밭, 빈집과 창고를 리모델링한 공간, 차를 매개로 한 프로그램을 연결해 청년이 지역에 머무는 방식을 실험합니다.',
  'https://upload.wikimedia.org/wikipedia/commons/b/b3/Boseong_Green_Tea_Field.jpg',
  'LAB',
  '#4E7C3A',
  '#6BAA50',
  'https://www.instagram.com/',
  'https://pf.kakao.com/',
  'hello@nuvio.kr',
  '061-000-2026',
  '전라남도 보성군 회천면',
  '[1013, 1014, 1015]'::jsonb,
  '[{"id":"official","label":"전체차LAB 공개 페이지","url":"/boseong","type":"website"},{"id":"instagram","label":"인스타그램","url":"https://www.instagram.com/","type":"instagram"}]'::jsonb,
  '[{"id":"story","type":"story","title":"전체차LAB 소개","body":"보성의 차 문화와 청년 체류 경험을 연결하는 로컬마을입니다.","items":["청년마을 운영","보성 차문화 콘텐츠","체류 프로그램 관리"]}]'::jsonb,
  now(),
  now(),
  now()
) on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  region = excluded.region,
  city = excluded.city,
  tagline = excluded.tagline,
  summary = excluded.summary,
  description = excluded.description,
  hero_image_url = excluded.hero_image_url,
  logo_text = excluded.logo_text,
  brand_color = excluded.brand_color,
  accent_color = excluded.accent_color,
  instagram_url = excluded.instagram_url,
  kakao_url = excluded.kakao_url,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  address = excluded.address,
  program_ids = excluded.program_ids,
  links = excluded.links,
  sections = excluded.sections,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.host_village_memberships (
  id,
  village_id,
  user_id,
  account_email,
  role,
  status,
  invited_at,
  activated_at
) values (
  '44444444-5555-4666-8777-888888888888',
  '33333333-4444-4555-8666-777777777777',
  null,
  'boseong.host@nuvio.local',
  'owner',
  'pending',
  now(),
  null
) on conflict (village_id, account_email) do update set
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.host_village_memberships (
  id,
  village_id,
  user_id,
  account_email,
  role,
  status,
  invited_at,
  activated_at
)
select
  '55555555-6666-4777-8888-999999999999',
  villages.id,
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  'demo.host@nuvio.local',
  'owner',
  'active',
  now(),
  now()
from public.villages
where villages.slug = 'daon-local-lab'
on conflict (village_id, account_email) do update set
  user_id = excluded.user_id,
  role = excluded.role,
  status = excluded.status,
  activated_at = excluded.activated_at,
  updated_at = now();
