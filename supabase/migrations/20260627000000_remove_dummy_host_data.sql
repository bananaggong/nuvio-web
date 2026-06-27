-- Remove rough/demo host data that should not appear in the product.
-- Official Boseong content and named operating programs are intentionally left intact.

delete from public.report_projects
where
  id in (
    '82c957d8-5a60-4825-bda8-d28f4ade5cd4',
    'b27d20f6-0208-418a-bd0a-62f356a0eb35',
    '1f4675e2-85fc-4fc6-a74f-0c75511dc27d',
    '0e13374e-c890-44b9-9923-3404b278c730',
    'd04c7e86-211d-4a65-bb10-05484456ca2d',
    '44444444-5555-4666-8777-888888888888'
  )
  or name in (
    'zcxv',
    '454654',
    'ㅇㄴㅇㅇㅇㅇ',
    'ㅇㅇㅇ',
    'test',
    '다온 로컬랩 2026 운영 폴더'
  )
  or schema->>'title' = '다온 로컬랩 2026 운영 폴더';

delete from public.homepage_hero_slides
where id in (
  'demo-namhae-workation',
  'demo-daon-local-lab',
  'demo-local-stays',
  'demo-host-center'
);

delete from public.host_social_connections
where village_slug in (
  'daon-local-lab',
  '전남-여수-0623테스트-qmsfa',
  '전국-로컬-새-로컬페이지-ycifd',
  'local-home-mpeirx5n',
  'local-home-mpdq90ih'
);

delete from public.village_assets
where village_slug in (
  '전남-여수-0623테스트-qmsfa',
  '전국-로컬-새-로컬페이지-ycifd',
  'local-home-mpeirx5n',
  'local-home-mpdq90ih',
  'daon-local-lab'
);

delete from public.village_media_contents
where village_slug in (
  '전남-여수-0623테스트-qmsfa',
  '전국-로컬-새-로컬페이지-ycifd',
  'local-home-mpeirx5n',
  'local-home-mpdq90ih',
  'daon-local-lab'
);

delete from public.village_page_sections
where village_slug in (
  '전남-여수-0623테스트-qmsfa',
  '전국-로컬-새-로컬페이지-ycifd',
  'local-home-mpeirx5n',
  'local-home-mpdq90ih',
  'daon-local-lab'
);

delete from public.programs
where
  id in (
    '74fd292b-0208-447e-8f7a-6ecc69acc7a3',
    '235aca60-7c8a-4e35-b8a6-643251a630bd',
    '371741d1-8ed8-49e8-b1b7-613559aa97f7',
    '9ac9920e-788f-4576-92cd-9cad468531e8',
    '270e789a-5a4e-4548-8d47-8849757fd725',
    '7f7a30f9-8923-4d07-a626-d953ee404262',
    'b174d5c5-a0d2-419d-8a1b-52bf5fafec63',
    '53a49de1-6faf-43de-b1af-459f0c9c8306',
    '2b28b47e-1341-4573-9fe6-dabf47db0c05',
    '04de5444-3164-4b62-a81d-63e4d55f4e46',
    'e3f155f1-e2ae-4725-a30f-09ca6b25ee1d',
    '5f63a47b-e5fa-4a2a-89df-e828ed3fe877',
    '22222222-3333-4444-8555-666666666666'
  )
  or slug = 'namhae-blue-workation-2026'
  or title in (
    '프그로그램 1',
    '프로그램이름',
    'sdfsdf',
    '전채차랩',
    'testtest0606',
    'ㅇㅇ',
    '이름',
    'ㅁㄴㅇㄻㄴㅇㄹ',
    'test',
    'adsf',
    'sk',
    'asdf',
    '남해 바다 워케이션 7일'
  );

delete from public.villages as village
where
  (
    village.id in (
      '92f02f4e-cbd2-4d2a-9de7-3391eff11854',
      'd8348fe0-ad53-41fc-93d2-e98ebec1c84b',
      '11111111-2222-4333-8444-555555555555',
      '64e959bb-7d8e-44ff-8fbc-c73da403dcbb',
      '82eaf35c-2652-40ba-b8a4-fc748f7e0040'
    )
    or village.slug in (
      '전남-여수-0623테스트-qmsfa',
      '전국-로컬-새-로컬페이지-ycifd',
      'daon-local-lab',
      'local-home-mpeirx5n',
      'local-home-mpdq90ih'
    )
    or village.name in (
      '0623테스트',
      '새 로컬페이지',
      '다온 로컬랩',
      'ㅁㄴㅇㄹ',
      '새 로컬홈'
    )
  )
  and village.slug <> 'boseong'
  and not exists (
    select 1
    from public.programs as program
    where program.village_id = village.id
  );
