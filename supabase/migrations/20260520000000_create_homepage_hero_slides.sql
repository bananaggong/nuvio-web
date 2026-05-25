create table if not exists public.homepage_hero_slides (
  id text primary key,
  eyebrow text not null default '',
  title text not null,
  subtitle text not null,
  image_url text not null,
  href text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_hero_slides_published_idx
  on public.homepage_hero_slides (published);

create index if not exists homepage_hero_slides_sort_order_idx
  on public.homepage_hero_slides (sort_order);

drop trigger if exists homepage_hero_slides_set_updated_at
  on public.homepage_hero_slides;

create trigger homepage_hero_slides_set_updated_at
before update on public.homepage_hero_slides
for each row execute function public.set_updated_at();

alter table public.homepage_hero_slides enable row level security;

drop policy if exists "Public can read published homepage hero slides"
  on public.homepage_hero_slides;
create policy "Public can read published homepage hero slides"
on public.homepage_hero_slides for select
to anon, authenticated
using (published = true or public.is_admin());

drop policy if exists "Admins can manage homepage hero slides"
  on public.homepage_hero_slides;
create policy "Admins can manage homepage hero slides"
on public.homepage_hero_slides for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.homepage_hero_slides (
  id,
  eyebrow,
  title,
  subtitle,
  image_url,
  href,
  sort_order,
  published
) values
  (
    'demo-namhae-workation',
    '추천 프로그램',
    '남해 바다 워케이션 7일',
    '남해 바다 앞 공유 작업공간에서 7일간 일하고 쉬며 로컬 클래스를 경험하는 워케이션 프로그램입니다.',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82',
    '/programs/namhae-blue-workation-2026',
    0,
    true
  ),
  (
    'demo-daon-local-lab',
    '로컬채널',
    '다온 로컬랩',
    '빈집과 공유 작업공간, 지역 클래스를 연결해 남해 체류 경험을 운영하는 첫 번째 누비오 로컬채널입니다.',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82',
    '/daon-local-lab',
    1,
    true
  ),
  (
    'demo-local-stays',
    '새로운 체류',
    '로컬 체류 프로그램 모아보기',
    '일주일 워케이션부터 지역 클래스까지, 지금 신청 가능한 누비오 프로그램을 한 번에 확인해보세요.',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1600&q=82',
    '/',
    2,
    true
  ),
  (
    'demo-host-center',
    '호스트 공간',
    '호스트센터에서 프로그램을 운영하세요',
    '로컬채널, 프로그램 등록, 신청자 관리까지 운영 흐름을 한 화면에서 이어갈 수 있습니다.',
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=82',
    '/host',
    3,
    true
  )
on conflict (id) do update set
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  subtitle = excluded.subtitle,
  image_url = excluded.image_url,
  href = excluded.href,
  sort_order = excluded.sort_order,
  published = excluded.published,
  updated_at = now();
