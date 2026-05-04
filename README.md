# NUVIO

NUVIO는 국내외 여행지원금, 한달살기, 워케이션, 반값여행, 로컬 프로젝트 정보를 탐색하고 지원 과정을 기록할 수 있는 여행지원금 플랫폼 MVP입니다.

벤치마크 서비스의 사용자 문제와 정보 구조를 참고하되, 브랜드, UI, 문구, 이미지, 데이터는 독자적으로 구성했습니다. 외부 공고와 파트너 제출 콘텐츠는 출처와 이용 권한 확인을 전제로 운영하는 방향입니다.

## 주요 기능

- 여행지원금 프로그램 목록, 검색, 필터, 정렬
- 테마 필터: 짧은여행, 한달살기, 워케이션, 로컬프로젝트, 귀농귀촌, 반값여행 등
- 프로그램 상세 페이지와 신청하기, 모집공고, 전화문의 CTA
- 보관하기, 알림받기, 지원했어요 상태 기록
- 반값여행 가이드와 관련 프로그램 목록
- 후기/팁 목록, 상세, 작성 화면
- 실시간 공지 목록과 상세 화면
- 파트너 프로그램 등록/제보 폼
- 운영자 콘솔 MVP
- 임시 JSON API: 프로그램, 후기, 공지

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth/Postgres/Storage
- Drizzle ORM
- lucide-react
- LocalStorage 기반 MVP 상태 저장

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 스크립트

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run supabase:start
npm run supabase:db:reset
npm run supabase:db:push
npm run db:generate
npm run db:push
npm run db:studio
```

## Supabase 설정

Supabase는 운영 가능한 백엔드 기준으로 준비합니다. 스키마와 RLS 정책은 대시보드 클릭이 아니라 repo 안의 SQL/TypeScript 파일로 관리합니다.

- CLI 설정: `supabase/config.toml`
- 초기 마이그레이션: `supabase/migrations/20260504000000_initial_supabase_schema.sql`
- 기본 RSS 소스 seed: `supabase/seed.sql`
- Drizzle 스키마: `src/db/schema.ts`
- Drizzle 클라이언트: `src/db/client.ts`
- Supabase SSR 클라이언트: `src/lib/supabase/*`
- Next.js 16 auth cookie refresh: `src/proxy.ts`

필요 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

로컬에서 Supabase를 띄우려면 Docker Desktop을 켠 뒤 실행합니다.

```bash
npm run supabase:start
npm run supabase:db:reset
```

호스팅된 Supabase 프로젝트를 연결한 뒤에는 `supabase link --project-ref <project-ref>` 후 `npm run supabase:db:push`로 마이그레이션을 적용합니다.

## 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 프로그램 탐색 홈 |
| `/programs/[id]` | 프로그램 상세 |
| `/half-price-travel` | 반값여행 가이드 |
| `/reviews` | 후기/팁 목록 |
| `/reviews/[id]` | 후기 상세 |
| `/reviews/new` | 후기 작성 |
| `/announcements` | 실시간 공지 목록 |
| `/announcements/[id]` | 공지 상세 |
| `/partners/apply` | 파트너 등록/제보 |
| `/login` | MVP 프로필 저장 |
| `/me` | 내 보관/알림/지원 기록 |
| `/admin` | 운영자 콘솔 |
| `/api/programs` | 프로그램 JSON API |
| `/api/reviews` | 후기 JSON API |
| `/api/announcements` | 공지 JSON API |

## 데이터 구조

현재 MVP는 `src/lib/data.ts`의 시드 데이터를 사용합니다.

- `programs`: 여행지원 프로그램
- `reviews`: 후기/팁
- `announcements`: 실시간 공지
- `themeOptions`, `periodOptions`, `regions`: 필터 옵션

사용자 프로필, 보관, 알림, 지원 기록, 후기 임시 저장, 파트너 제출, 관리자 초안, 외부 후보 승인/반려 상태는 브라우저 `localStorage`에 저장됩니다. 정식 서비스에서는 이 영역을 인증, DB, 관리자 승인 워크플로우로 교체하면 됩니다.

## 외부 공지 연동

`/api/announcements`는 이제 내부 시드 공지와 외부 RSS 공지를 함께 반환합니다. 기본 소스 레지스트리는 문화체육관광부 공지/보도자료 RSS와 한국콘텐츠진흥원 공지 RSS를 포함하며, HTML 화면을 무단 스크래핑하지 않고 공개 RSS/API 또는 파트너가 허용한 피드만 연결하는 구조입니다.

- 수집기: `src/lib/live-announcements.ts`
- 기본 소스 레지스트리: `src/lib/announcement-sources.ts`
- 링크 처리: `src/lib/announcement-links.ts`
- 홈 실시간 띠배너: `src/components/live-announcement-strip.tsx`
- 기본 캐시: `ANNOUNCEMENT_REFRESH_SECONDS=300`
- 외부 소스 추가: `.env.local`의 `EXTERNAL_ANNOUNCEMENT_SOURCES`에 JSON 배열로 RSS URL 추가
- 기본 소스 비활성화: `.env.local`의 `DISABLED_ANNOUNCEMENT_SOURCE_IDS`에 쉼표로 구분한 소스 ID 입력
- 외부 공고 후보 큐: `/api/program-leads`와 운영자 콘솔의 후보 목록
- 외부 소스 상태: 운영자 콘솔의 소스 상태 카드에서 수집 건수와 오류 확인
- 후보 최소 점수: `PROGRAM_LEAD_MIN_SCORE=2`

예시:

```bash
ANNOUNCEMENT_REFRESH_SECONDS=300
PROGRAM_LEAD_MIN_SCORE=2
DISABLED_ANNOUNCEMENT_SOURCE_IDS=
EXTERNAL_ANNOUNCEMENT_SOURCES=[{"id":"mcst-notice","name":"문화체육관광부 공지 RSS","type":"rss","url":"https://www.mcst.go.kr/common/rss/notice.jsp","keywords":["관광","여행","지원","공모","모집"],"minimumKeywordMatches":0}]
```

## 구현 메모

- 이미지는 Unsplash 원격 이미지를 사용하며 `next.config.ts`에 `images.unsplash.com`을 허용했습니다.
- 날짜 계산 기준은 데모 안정성을 위해 `2026-05-04`로 고정되어 있습니다.
- 푸터와 정책 페이지에는 정보 중개 서비스 고지, 정부기관 비대표 고지, 콘텐츠 권리 원칙을 포함했습니다.
- 원 서비스의 브랜드, 아이콘, 문구, 후기, 프로그램 DB는 복제하지 않았습니다.

## 검증

아래 명령을 통과했습니다.

```bash
npm run lint
npm run build
```

주요 화면은 Playwright 스크린샷으로 확인했습니다.

## 다음 단계

- Supabase Auth/DB 기반 CRUD 연결
- 실제 소셜 로그인
- 프로그램/공지/후기 관리자 CRUD 저장
- 파트너 제출 승인 플로우
- 알림 발송
- SEO용 지역/테마 랜딩 페이지 확장
