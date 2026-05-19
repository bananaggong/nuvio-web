-- Demo scenario:
-- A fictional host signs up, connects one local-home channel, and publishes one program.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  'authenticated',
  'authenticated',
  'demo.host@nuvio.local',
  crypt('Nuvio-demo-host-2026!', gen_salt('bf')),
  '2026-05-19 09:00:00+09',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"박다온","phone":"010-2405-2026","address":"전라남도 남해군 남해읍"}'::jsonb,
  '2026-05-19 09:00:00+09',
  '2026-05-19 09:00:00+09'
) on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

delete from auth.identities
where user_id = '0f8fad5b-d9cb-469f-a165-70867728950e'
  and provider = 'email';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) then
    execute $identity$
      insert into auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        '{"sub":"0f8fad5b-d9cb-469f-a165-70867728950e","email":"demo.host@nuvio.local"}'::jsonb,
        'email',
        '2026-05-19 09:00:00+09',
        '2026-05-19 09:00:00+09',
        '2026-05-19 09:00:00+09'
      )
    $identity$;
  else
    execute $identity$
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        '{"sub":"0f8fad5b-d9cb-469f-a165-70867728950e","email":"demo.host@nuvio.local"}'::jsonb,
        'email',
        '2026-05-19 09:00:00+09',
        '2026-05-19 09:00:00+09',
        '2026-05-19 09:00:00+09'
      )
    $identity$;
  end if;
end $$;

insert into public.profiles (
  id,
  email,
  display_name,
  role,
  onboarding_intent,
  onboarding_completed_at,
  avatar_url,
  phone,
  contact_email,
  address,
  created_at,
  updated_at
) values (
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  'demo.host@nuvio.local',
  '박다온',
  'user',
  'host',
  '2026-05-19 09:00:00+09',
  '',
  '010-2405-2026',
  'demo.host@nuvio.local',
  '전라남도 남해군 남해읍',
  '2026-05-19 09:00:00+09',
  '2026-05-19 09:00:00+09'
) on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  onboarding_intent = excluded.onboarding_intent,
  onboarding_completed_at = excluded.onboarding_completed_at,
  avatar_url = excluded.avatar_url,
  phone = excluded.phone,
  contact_email = excluded.contact_email,
  address = excluded.address,
  updated_at = excluded.updated_at;

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
  created_by,
  created_at,
  updated_at
) values (
  '11111111-2222-4333-8444-555555555555',
  'daon-local-lab',
  '다온 로컬랩',
  '전라남도',
  '남해군',
  '남해 바다 앞에서 일하고 쉬는 7일',
  '다온 로컬랩은 남해의 빈집과 공유 작업공간을 연결해 워케이션 프로그램을 운영하는 로컬 채널입니다.',
  '가상의 호스트 박다온이 누비오에 가입한 뒤 만든 첫 운영 채널입니다. 참여자는 숙소, 작업 공간, 로컬 클래스가 결합된 워케이션 프로그램을 신청할 수 있습니다.',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82',
  'DAON',
  '#0f766e',
  '#2563eb',
  'https://www.instagram.com/daon.local.lab',
  'https://pf.kakao.com/_daonlocal',
  'demo.host@nuvio.local',
  '010-2405-2026',
  '전라남도 남해군 남해읍',
  '["22222222-3333-4444-8555-666666666666", "namhae-blue-workation-2026"]'::jsonb,
  '[{"id":"instagram","label":"인스타그램","url":"https://www.instagram.com/daon.local.lab","type":"instagram"},{"id":"notice","label":"운영 문의","url":"/partners/apply","type":"notice"}]'::jsonb,
  '[{"id":"story","type":"story","title":"다온 로컬랩 소개","body":"남해의 바다, 빈집, 로컬 커뮤니티를 연결해 짧은 체류형 워케이션을 운영합니다.","items":["공유 작업공간 운영","로컬 클래스 연결","체류자 신청/안내 관리"]},{"id":"programs","type":"programs","title":"대표 프로그램","body":"첫 번째 프로그램은 남해 바다 워케이션 7일입니다.","items":["6박 7일 체류","공유 오피스 이용","로컬 클래스 2회"]}]'::jsonb,
  '2026-05-19 09:10:00+09',
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  '2026-05-19 09:10:00+09',
  '2026-05-19 09:10:00+09'
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
  created_by = excluded.created_by,
  updated_at = excluded.updated_at;

insert into public.programs (
  id,
  legacy_id,
  title,
  slug,
  region,
  city,
  is_global,
  summary,
  description,
  theme,
  categories,
  hashtags,
  period_key,
  activity_start,
  activity_end,
  recruit_start,
  recruit_end,
  target,
  capacity,
  announcement,
  subsidy_label,
  subsidy_amount,
  fee,
  applicants,
  status,
  source_name,
  source_url,
  apply_url,
  phone,
  image_url,
  gallery,
  badges,
  body,
  village_id,
  published_at,
  created_by,
  approved_by,
  created_at,
  updated_at
) values (
  '22222222-3333-4444-8555-666666666666',
  26001,
  '남해 바다 워케이션 7일',
  'namhae-blue-workation-2026',
  '전라남도',
  '남해군',
  false,
  '남해 바다 앞 공유 작업공간에서 7일간 일하고 쉬며 로컬 클래스를 경험하는 워케이션 프로그램입니다.',
  '가상의 호스트 박다온이 누비오 호스트센터에서 등록한 첫 번째 프로그램입니다. 참여자는 숙소와 공유 오피스, 로컬 클래스, 커뮤니티 저녁 모임을 한 번에 신청합니다.',
  'workation',
  '["workation","local"]'::jsonb,
  '["남해","워케이션","로컬체류","바다"]'::jsonb,
  'week',
  '2026-06-17',
  '2026-06-23',
  '2026-05-20',
  '2026-06-05',
  '원격근무자, 프리랜서, 로컬 체류를 경험하고 싶은 개인',
  '12명',
  '2026.06.05 모집 마감',
  '숙박/공간 이용 일부 지원',
  300000,
  '자부담 120,000원',
  0,
  'open',
  '다온 로컬랩',
  'https://www.nuvio.kr/daon-local-lab',
  '/programs/namhae-blue-workation-2026/apply',
  '010-2405-2026',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82',
  '["https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82"]'::jsonb,
  '["신규","워케이션","지원금"]'::jsonb,
  '["6박 7일 남해 체류형 워케이션입니다.","공유 작업공간, 로컬 클래스 2회, 커뮤니티 저녁 모임을 포함합니다.","운영자는 누비오 호스트센터에서 신청자와 안내 메시지를 관리합니다."]'::jsonb,
  '11111111-2222-4333-8444-555555555555',
  '2026-05-19 09:30:00+09',
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  null,
  '2026-05-19 09:30:00+09',
  '2026-05-19 09:30:00+09'
) on conflict (id) do update set
  legacy_id = excluded.legacy_id,
  title = excluded.title,
  slug = excluded.slug,
  region = excluded.region,
  city = excluded.city,
  is_global = excluded.is_global,
  summary = excluded.summary,
  description = excluded.description,
  theme = excluded.theme,
  categories = excluded.categories,
  hashtags = excluded.hashtags,
  period_key = excluded.period_key,
  activity_start = excluded.activity_start,
  activity_end = excluded.activity_end,
  recruit_start = excluded.recruit_start,
  recruit_end = excluded.recruit_end,
  target = excluded.target,
  capacity = excluded.capacity,
  announcement = excluded.announcement,
  subsidy_label = excluded.subsidy_label,
  subsidy_amount = excluded.subsidy_amount,
  fee = excluded.fee,
  applicants = excluded.applicants,
  status = excluded.status,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  apply_url = excluded.apply_url,
  phone = excluded.phone,
  image_url = excluded.image_url,
  gallery = excluded.gallery,
  badges = excluded.badges,
  body = excluded.body,
  village_id = excluded.village_id,
  published_at = excluded.published_at,
  created_by = excluded.created_by,
  approved_by = excluded.approved_by,
  updated_at = excluded.updated_at;

insert into public.host_social_connections (
  id,
  village_slug,
  provider,
  facebook_user_id,
  page_id,
  page_name,
  page_access_token,
  instagram_user_id,
  instagram_username,
  access_token,
  token_expires_at,
  permissions,
  status,
  last_synced_at,
  last_sync_error,
  raw,
  created_at,
  updated_at
) values (
  '33333333-4444-4555-8666-777777777777',
  'daon-local-lab',
  'instagram',
  null,
  null,
  '다온 로컬랩',
  null,
  '17841400000000000',
  'daon.local.lab',
  'demo-token-do-not-use',
  '2026-12-31 23:59:59+09',
  '["instagram_basic","pages_show_list"]'::jsonb,
  'connected',
  '2026-05-19 09:40:00+09',
  null,
  '{"demo":true,"scenario":"single-host-single-channel-single-program"}'::jsonb,
  '2026-05-19 09:40:00+09',
  '2026-05-19 09:40:00+09'
) on conflict (village_slug, provider) do update set
  page_name = excluded.page_name,
  instagram_user_id = excluded.instagram_user_id,
  instagram_username = excluded.instagram_username,
  access_token = excluded.access_token,
  token_expires_at = excluded.token_expires_at,
  permissions = excluded.permissions,
  status = excluded.status,
  last_synced_at = excluded.last_synced_at,
  last_sync_error = excluded.last_sync_error,
  raw = excluded.raw,
  updated_at = excluded.updated_at;

insert into public.report_projects (
  id,
  program_id,
  name,
  organization_name,
  report_type,
  status,
  schema,
  due_date,
  created_at,
  updated_at
) values (
  '44444444-5555-4666-8777-888888888888',
  '22222222-3333-4444-8555-666666666666',
  '다온 로컬랩 2026 운영 프로젝트',
  '다온 로컬랩',
  'operation-closeout',
  'collecting',
  '{
    "title": "다온 로컬랩 2026 운영 프로젝트",
    "villageName": "다온 로컬랩",
    "agencyName": "다온 로컬랩",
    "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82",
    "programTitle": "남해 바다 워케이션 7일",
    "connectedProgramTitles": ["남해 바다 워케이션 7일"],
    "periodLabel": "2026.05.20 - 2026.06.23",
    "ownerName": "박다온",
    "status": "review",
    "sections": ["overview","budget","expenses","evidence","activities","risks","nextActions"],
    "budgetCategories": [
      {"id":"budget-stay","label":"숙박/공간","parentLabel":"운영비","plannedAmount":2400000},
      {"id":"budget-program","label":"로컬 클래스","parentLabel":"프로그램비","plannedAmount":1200000},
      {"id":"budget-promotion","label":"모집 홍보","parentLabel":"홍보비","plannedAmount":600000}
    ],
    "evidenceRules": [
      {"id":"evidence-receipt","categoryId":"budget-stay","label":"영수증 또는 세금계산서","required":true,"type":"file"},
      {"id":"evidence-activity","categoryId":"budget-program","label":"활동 사진과 참석 기록","required":true,"type":"file"}
    ],
    "expenseEvents": [
      {
        "id":"expense-space-deposit",
        "title":"공유 작업공간 예약금",
        "spentAt":"2026-05-21",
        "categoryId":"budget-stay",
        "amount":800000,
        "vendor":"남해 코워킹하우스",
        "paymentMethod":"transfer",
        "linkedActivityId":"activity-orientation",
        "memo":"프로그램 운영 공간 예약금",
        "evidenceItems":[
          {"ruleId":"evidence-receipt","label":"영수증 또는 세금계산서","status":"submitted","fileName":"space-deposit.pdf"},
          {"ruleId":"evidence-activity","label":"활동 사진과 참석 기록","status":"missing"}
        ]
      }
    ],
    "activityEvents": [
      {
        "id":"activity-orientation",
        "title":"참여자 오리엔테이션",
        "activityAt":"2026-06-17",
        "place":"다온 로컬랩 공유라운지",
        "relatedProgramTitle":"남해 바다 워케이션 7일",
        "participantCount":0,
        "photosCount":0,
        "description":"참여자 체크인, 공간 안내, 로컬 클래스 일정을 공유합니다."
      }
    ],
    "manualFields": [
      {"id":"manual-host-scenario","group":"report_manual_input","label":"데모 시나리오","fieldType":"text","required":true,"value":"가상 호스트 박다온이 가입 후 첫 프로그램을 등록한 상태"}
    ]
  }'::jsonb,
  '2026-06-30',
  '2026-05-19 09:45:00+09',
  '2026-05-19 09:45:00+09'
) on conflict (id) do update set
  program_id = excluded.program_id,
  name = excluded.name,
  organization_name = excluded.organization_name,
  report_type = excluded.report_type,
  status = excluded.status,
  schema = excluded.schema,
  due_date = excluded.due_date,
  updated_at = excluded.updated_at;
