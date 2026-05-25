-- Normalize already-seeded product copy to the current NUVIO terminology.
-- This keeps production rows aligned even when the original seed migration already ran.

update public.homepage_hero_slides
set
  eyebrow = replace(eyebrow, '로컬 채널', '로컬채널'),
  subtitle = replace(
    replace(subtitle, '누비오 채널', '누비오 로컬채널'),
    '마을 채널',
    '로컬채널'
  ),
  updated_at = now()
where
  eyebrow like '%로컬 채널%'
  or subtitle like '%누비오 채널%'
  or subtitle like '%마을 채널%';

update public.programs
set
  title = replace(replace(title, '로컬프로젝트', '로컬미션'), '프로젝트', '프로그램'),
  summary = replace(
    replace(
      replace(summary, '로컬프로젝트', '로컬미션'),
      '로컬 프로젝트',
      '로컬 미션'
    ),
    '프로젝트',
    '프로그램'
  ),
  description = replace(
    replace(
      replace(description, '로컬프로젝트', '로컬미션'),
      '로컬 프로젝트',
      '로컬 미션'
    ),
    '프로젝트',
    '프로그램'
  ),
  hashtags = replace(hashtags::text, '로컬프로젝트', '로컬미션')::jsonb,
  body = replace(
    replace(
      replace(
        replace(
          replace(body::text, '마을 페이지', '로컬페이지'),
          '참가자는',
          '누비어는'
        ),
        '참여자는',
        '누비어는'
      ),
      '참가팀',
      '누비어 팀'
    ),
    '참여자',
    '누비어'
  )::jsonb,
  updated_at = now()
where
  title like '%프로젝트%'
  or title like '%로컬프로젝트%'
  or summary like '%프로젝트%'
  or summary like '%로컬 프로젝트%'
  or description like '%프로젝트%'
  or description like '%로컬 프로젝트%'
  or hashtags::text like '%로컬프로젝트%'
  or body::text like '%마을 페이지%'
  or body::text like '%참가자%'
  or body::text like '%참여자%';

update public.villages
set
  summary = replace(
    replace(
      replace(
        replace(summary, '마을 페이지', '로컬페이지'),
        '마을 홈페이지',
        '로컬페이지'
      ),
      '운영 채널',
      '로컬페이지'
    ),
    '로컬 채널',
    '로컬페이지'
  ),
  description = replace(
    replace(
      replace(
        replace(description, '마을 페이지', '로컬페이지'),
        '마을 홈페이지',
        '로컬페이지'
      ),
      '운영 채널',
      '로컬페이지'
    ),
    '로컬 채널',
    '로컬페이지'
  ),
  sections = replace(
    replace(
      replace(
        replace(
          replace(sections::text, '마을 페이지', '로컬페이지'),
          '마을 홈페이지',
          '로컬페이지'
        ),
        '참여자',
        '누비어'
      ),
      '운영자',
      '호스트'
    ),
    '마을 소식',
    '로컬 소식'
  )::jsonb,
  updated_at = now()
where
  summary like '%마을 페이지%'
  or summary like '%마을 홈페이지%'
  or summary like '%운영 채널%'
  or summary like '%로컬 채널%'
  or description like '%마을 페이지%'
  or description like '%마을 홈페이지%'
  or description like '%운영 채널%'
  or description like '%로컬 채널%'
  or sections::text like '%마을 페이지%'
  or sections::text like '%마을 홈페이지%'
  or sections::text like '%참여자%'
  or sections::text like '%운영자%'
  or sections::text like '%마을 소식%';

update public.village_media_contents
set
  summary = replace(replace(summary, '참여자', '누비어'), '마을 홈페이지', '로컬페이지'),
  body = replace(
    replace(
      replace(
        replace(body::text, '마을 페이지', '로컬페이지'),
        '마을 홈페이지',
        '로컬페이지'
      ),
      '참여자',
      '누비어'
    ),
    '신규 누비어',
    '새 누비어'
  )::jsonb,
  updated_at = now()
where
  summary like '%참여자%'
  or summary like '%마을 홈페이지%'
  or body::text like '%마을 페이지%'
  or body::text like '%마을 홈페이지%'
  or body::text like '%참여자%';

update public.report_projects
set
  name = replace(name, '운영 프로젝트', '운영 폴더'),
  schema = replace(
    replace(
      replace(schema::text, '운영 프로젝트', '운영 폴더'),
      '로컬페이지 프로젝트',
      '로컬페이지 폴더'
    ),
    '참여자',
    '누비어'
  )::jsonb,
  updated_at = now()
where
  name like '%운영 프로젝트%'
  or schema::text like '%운영 프로젝트%'
  or schema::text like '%로컬페이지 프로젝트%'
  or schema::text like '%참여자%';
