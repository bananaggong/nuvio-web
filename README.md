# NUVIO Web

NUVIO는 지역 체류 프로그램을 찾는 참가자와 프로그램을 운영하는 마을/기관을 연결하는 운영 플랫폼입니다. 단순 소개 사이트가 아니라, 공개 공고 수집, 프로그램 게시, 신청, 기수 운영, 메시지, 보고서 흐름을 하나의 제품으로 묶는 것을 목표로 합니다.

현재 구현 범위는 NUVIO Layer 1 공개 탐색 경험과 Layer 2 호스트 운영 SaaS의 초기 골격입니다. 각 마을은 슬래시페이지처럼 독립 홈페이지를 가질 수 있고, 프로그램은 공식 외부 공고 후보 또는 Supabase에 게시된 운영 프로그램으로 노출됩니다.

## URL 전략

초기 운영은 경로형 주소를 기본으로 사용합니다.

| 용도 | 경로 |
| --- | --- |
| 마을 목록 | `/villages` |
| 마을 canonical 주소 | `/villages/[slug]` |
| 짧은 마을 주소 | `/[villageSlug]` |
| 마을별 프로그램 | `/[villageSlug]/[programSlug]` |
| 예시 | `/boseong`, `/gangneung-wave/gangneung-wave-workation` |

서브도메인과 커스텀 도메인은 현재 범위에서 제외했습니다. 운영자는 slug만 관리하고, 모든 마을은 같은 NUVIO 도메인의 경로형 URL로 제공합니다.

## 핵심 기능

- 공식 RSS/공고 소스 기반 외부 공고 수집
- 외부 공고를 프로그램 후보로 점수화하고 공개 홈에 우선 노출
- Supabase `programs.published_at` 기준 직접 게시 프로그램 노출
- seed 데이터는 실제 외부/DB 데이터가 없을 때만 빈 화면 방지용으로 사용
- 공개 프로그램 검색, 필터, 상세, 신청 페이지
- Supabase Auth 기반 Google, Kakao, Naver 소셜 로그인 코드
- `/me` 계정 페이지에서 세션, 프로필, 신청 이력 조회
- 호스트 프로그램 스튜디오와 신청서 빌더
- 신청자 DB 저장, 상태 변경, 운영 콘솔 타임라인
- 메시지 캠페인, 보고서 프로젝트, CSV 내보내기 기반
- 마을 홈페이지 스튜디오와 공개 마을 페이지
- 구현 현황 확인용 `/admin/implementation` 및 JSON API

## 공개 프로그램 데이터 우선순위

홈과 `/api/programs`는 아래 순서로 데이터를 구성합니다.

1. 공식 외부 RSS/공고 소스에서 수집한 프로그램 후보
2. Supabase에 게시된 운영 프로그램
3. 위 데이터가 모두 없을 때만 seed 예시 데이터

외부 공고 후보는 신청 기간, 지원 금액, 모집 인원처럼 RSS에 구조화되어 있지 않은 값은 `원문 확인`으로 표시합니다. 실제 신청/결제/기수 운영에 연결하려면 운영자가 후보를 검수해 프로그램으로 게시해야 합니다.

## 외부 공고 수집

- 기본 소스: 문화체육관광부 공지 RSS, 문화체육관광부 보도자료 RSS, 한국콘텐츠진흥원 공지 RSS
- API 요청 시 저장된 공고가 오래되었으면 실제 RSS를 다시 가져와 DB에 적재합니다.
- Vercel Cron은 하루 1회 백업 수집으로 설정되어 있습니다.
- `ANNOUNCEMENT_REFRESH_SECONDS` 기본 권장값은 `43200`초, 즉 하루 2회입니다.

관련 파일:

- `src/lib/live-announcements.ts`
- `src/lib/announcement-refresh.ts`
- `src/lib/announcement-sources.ts`
- `src/lib/external-announcement-db.ts`
- `src/lib/program-leads.ts`
- `src/lib/crawled-programs.ts`
- `src/app/api/announcements/route.ts`
- `src/app/api/cron/refresh-announcements/route.ts`
- `vercel.json`

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres/Auth
- Drizzle ORM
- Vercel
- lucide-react

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

## 환경 변수

로컬 개발은 `.env.local`을 사용합니다. 실제 값은 커밋하지 않습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_NAVER_PROVIDER=custom:naver
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_DATABASE_URL=
ANNOUNCEMENT_REFRESH_SECONDS=43200
PROGRAM_LEAD_MIN_SCORE=2
DISABLED_ANNOUNCEMENT_SOURCE_IDS=
EXTERNAL_ANNOUNCEMENT_SOURCES=
CRON_SECRET=
```

Vercel Production, Preview, Development 환경에도 같은 Supabase 연결 변수가 필요합니다.

## Supabase

Supabase는 운영 가능한 Postgres/Auth 백엔드로 사용합니다. 스키마는 SQL migration과 Drizzle schema를 함께 관리합니다.

주요 파일:

- `supabase/config.toml`
- `supabase/migrations/*`
- `supabase/seed.sql`
- `src/db/schema.ts`
- `src/db/client.ts`

주요 테이블:

- `profiles`
- `villages`
- `programs`
- `program_applications`
- `program_application_forms`
- `message_campaigns`
- `message_templates`
- `scheduled_messages`
- `report_projects`
- `external_announcement_sources`
- `external_announcements`
- `program_leads`
- `program_lead_decisions`

원격 Supabase 프로젝트에 migration을 적용합니다.

```bash
npx supabase link --project-ref <project-ref>
npm run supabase:db:push
```

## 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 크롤 기반 공고 후보와 게시 프로그램 탐색 |
| `/programs/[id]` | 프로그램 상세 |
| `/programs/[id]/apply` | 프로그램 신청 |
| `/villages` | 마을 홈 목록 |
| `/villages/[slug]` | 마을 canonical route |
| `/[villageSlug]` | 짧은 마을 홈 주소 |
| `/[villageSlug]/[programSlug]` | 마을 단위 프로그램 상세 |
| `/announcements` | 실시간 공지 |
| `/reviews` | 후기 |
| `/partners/apply` | 파트너 제안 |
| `/login` | 소셜 로그인 |
| `/me` | 마이페이지 |
| `/host` | 호스트 운영 콘솔 |
| `/host/villages` | 마을 홈 스튜디오 |
| `/host/programs` | 프로그램 스튜디오 |
| `/host/forms` | 신청서 빌더 |
| `/host/messages` | 메시지 자동화 센터 |
| `/host/reports` | 보고서 자동화 센터 |
| `/admin` | 관리자 콘솔 |
| `/admin/implementation` | 구현 현황 |

## 주요 API

| API | 설명 |
| --- | --- |
| `GET /api/programs` | 공개 프로그램 JSON |
| `GET /api/announcements` | 내부/외부 공지 JSON |
| `GET, POST, PATCH /api/announcement-sources` | 외부 공고 소스 조회/추가/활성화 |
| `GET /api/cron/refresh-announcements` | Cron 기반 외부 공고 수집 |
| `GET, POST /api/program-leads` | 외부 공고 기반 후보 조회, 승인/반려 |
| `POST /api/program-applications` | 프로그램 신청 저장 |
| `GET, POST /api/host/villages` | 호스트 마을 홈 조회/저장 |
| `GET, POST /api/host/programs` | 호스트 프로그램 초안 조회/저장 |
| `GET, POST /api/host/forms` | 신청서 템플릿 조회/저장 |
| `GET /api/auth/providers` | 소셜 로그인 provider 목록 |
| `GET /api/auth/session` | 현재 Supabase 세션/프로필 조회 |
| `POST /api/auth/logout` | 로그아웃 |
| `GET, PATCH /api/me/profile` | 내 프로필 조회/수정 |
| `GET /api/implementation-status` | 구현 현황 JSON |

## 검증

```bash
npm run lint
npm run build
npx drizzle-kit check
```

최근 확인해야 하는 경로:

- `/`
- `/api/programs`
- `/api/announcements`
- `/villages`
- `/boseong`
- `/gangneung-wave/gangneung-wave-workation`
- `/host`
- `/host/villages`
- `/host/programs`
- `/admin/implementation`

## 배포

GitHub `main` 브랜치에 push하면 Vercel Production 배포가 자동 생성됩니다.

Production URL:

- [https://nuvio.kr](https://nuvio.kr)
- [https://nuvio-web-blue.vercel.app](https://nuvio-web-blue.vercel.app)

`https://nuvio.kr` is the canonical production domain. Keep the Vercel URL as a
temporary fallback during DNS/Auth migration.

배포 상태 확인:

```bash
npx vercel ls nuvio-web --scope bananaggongs-projects
```

## 다음 작업 후보

- Supabase Auth provider별 실제 Client ID/Secret 입력 후 로그인 검증
- `profiles.role`을 partner/admin으로 승격하는 운영 UI 또는 정책 추가
- 외부 공고 후보를 운영자가 승인하면 실제 프로그램으로 게시하는 화면 강화
- 메시지 실제 발송 채널 연동: Resend, SMS, 카카오 알림톡
- 보고서 PDF/XLSX export
- 결제 PG 연동과 입금/결제 상태 자동 확인
- 경로형 마을 URL 기준 SEO/OG 메타데이터 보강
