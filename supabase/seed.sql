insert into public.external_announcement_sources (
  id,
  name,
  type,
  url,
  enabled,
  keywords,
  minimum_keyword_matches,
  notes
)
values
  (
    'mcst-notice',
    '문화체육관광부 공지 RSS',
    'rss',
    'https://www.mcst.go.kr/common/rss/notice.jsp',
    true,
    '["관광","여행","지원","공모","모집","체류","워케이션"]'::jsonb,
    0,
    '문화체육관광부 공식 RSS 서비스의 공지 피드입니다.'
  ),
  (
    'mcst-press',
    '문화체육관광부 보도자료 RSS',
    'rss',
    'https://www.mcst.go.kr/common/rss/press.jsp',
    true,
    '["관광","여행","지역","체류","워케이션","지원사업"]'::jsonb,
    1,
    '정책 발표와 사업 보도자료를 보수적으로 후보화합니다.'
  ),
  (
    'kocca-notice',
    '한국콘텐츠진흥원 공지 RSS',
    'rss',
    'http://www.kocca.kr/xml/notice/notice/rss_2.xml',
    true,
    '["관광","여행","지역","체류","콘텐츠","모집","지원"]'::jsonb,
    2,
    '문화·관광 연계 공모 후보를 보조 소스로 확인합니다.'
  )
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  enabled = excluded.enabled,
  keywords = excluded.keywords,
  minimum_keyword_matches = excluded.minimum_keyword_matches,
  notes = excluded.notes,
  updated_at = now();
