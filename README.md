# NUVIO Web

NUVIO는 지역 체류 프로그램의 탐색, 신청, 선정 안내, 운영 관리, 후기와 보고서 준비를 한 흐름으로 묶는 로컬 체류 운영 플랫폼입니다.

현재 구현 방향은 단순 소개 사이트가 아니라 집객 플랫폼(Layer 1)과 호스트 운영 SaaS(Layer 2)를 빠르게 연결하는 것입니다. 각 마을은 슬래시페이지처럼 독립 홈을 가질 수 있고, 프로그램 신청과 운영 콘솔은 Supabase DB를 기준으로 점진적으로 연결됩니다.

## URL 전략

초기 운영은 경로형 주소를 기본으로 사용합니다.

- 기본 공개 주소: `/villages/[slug]`
- 짧은 마을 주소: `/[villageSlug]`
- 마을 프로그램 주소: `/[villageSlug]/[programSlug]`
- 예시: `/boseong`, `/gangneung-wave/gangneung-wave-workation`

서브도메인과 커스텀 도메인은 나중에 바로 확장할 수 있도록 마을 데이터에 미리 필드를 둡니다.

- 서브도메인 후보: `boseong.nuvio.kr`
- 커스텀 도메인 후보: `village.example.com`
- 관련 DB 필드: `villages.subdomain`, `villages.custom_domain`

## 주요 기능

- 공개 프로그램 목록, 검색/필터, 상세/신청 페이지
- Supabase `programs.published_at` 기준 공개 프로그램 노출
- 외부 RSS 공고 수집, 공고 DB 저장, 프로그램 후보 생성
- Vercel Cron 기반 일 1회 백업 수집과 API 요청 시 stale refresh
- Supabase Auth 기반 Google, Kakao, Naver 소셜 로그인 코드
- `/me` 계정 페이지에서 세션, 프로필, 신청 이력 조회
- 호스트 프로그램 스튜디오와 공개 프로그램 초안 DB 저장
- 호스트 신청폼 빌더와 공개 신청 페이지 템플릿 반영
- 신청자 DB 저장, 상태 변경, 운영 콘솔 파이프라인
- 메시지 캠페인, 보고서 프로젝트, CSV 내보내기 기반
- 마을 홈 스튜디오: 마을 소개, 대표 이미지, 연락처, 연결 프로그램, 도메인 후보 관리
- 공개 마을 홈: `/villages`, `/boseong`, `/gangneung-wave/gangneung-wave-workation`
- 구현 현황 대시보드와 JSON API

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
ANNOUNCEMENT_REFRESH_SECONDS=300
PROGRAM_LEAD_MIN_SCORE=2
DISABLED_ANNOUNCEMENT_SOURCE_IDS=
EXTERNAL_ANNOUNCEMENT_SOURCES=
CRON_SECRET=
```

Vercel Production, Preview, Development 환경에도 같은 Supabase 연결 변수가 필요합니다.

## Supabase

Supabase는 운영 가능한 Postgres/Auth 백엔드로 사용합니다. 스키마는 SQL migration과 Drizzle schema를 함께 관리합니다.

- Supabase CLI 설정: `supabase/config.toml`
- Migration: `supabase/migrations/*`
- Seed: `supabase/seed.sql`
- Drizzle schema: `src/db/schema.ts`
- DB client: `src/db/client.ts`

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
| `/` | 프로그램 탐색 |
| `/programs/[id]` | 프로그램 상세 |
| `/programs/[id]/apply` | 프로그램 신청 |
| `/villages` | 마을 홈 목록 |
| `/villages/[slug]` | 마을 홈 canonical route |
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
| `/host/forms` | 신청폼 빌더 |
| `/host/messages` | 메시지 자동화 센터 |
| `/host/reports` | 보고서 자동화 센터 |
| `/admin` | 관리자 콘솔 |
| `/admin/implementation` | 구현 현황 확인 |

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
| `GET, POST /api/host/forms` | 신청폼 템플릿 조회/저장 |
| `GET /api/auth/providers` | 소셜 로그인 provider 목록 |
| `GET /api/auth/session` | 현재 Supabase 세션/프로필 조회 |
| `POST /api/auth/logout` | 로그아웃 |
| `GET, PATCH /api/me/profile` | 내 프로필 조회/수정 |
| `GET /api/implementation-status` | 구현 현황 JSON |

## 외부 공고 수집

`/api/announcements`는 내부 공지와 DB에 저장된 외부 RSS 공고를 함께 반환합니다. 저장본이 `ANNOUNCEMENT_REFRESH_SECONDS`보다 오래되면 API 요청 중 수집 파이프라인을 실행해 `external_announcements`, `program_leads`에 다시 적재합니다.

현재 연결된 Vercel 계정은 Hobby 제한이 있어 Vercel Cron은 하루 1회 백업 수집으로 설정했습니다. Pro 플랜으로 전환하면 `vercel.json`의 schedule을 더 촘촘하게 조정할 수 있습니다.

Cron 요청은 `Authorization: Bearer $CRON_SECRET`로 보호합니다.

관련 파일:

- `src/lib/live-announcements.ts`
- `src/lib/announcement-refresh.ts`
- `src/lib/external-announcement-db.ts`
- `src/lib/announcement-sources.ts`
- `src/lib/program-leads.ts`
- `src/lib/program-lead-db.ts`
- `src/app/api/cron/refresh-announcements/route.ts`
- `vercel.json`

## 검증

기본 검증:

```bash
npm run lint
npm run build
npx drizzle-kit check
```

최근 확인 경로:

- `/`
- `/villages`
- `/boseong`
- `/gangneung-wave/gangneung-wave-workation`
- `/host`
- `/host/villages`
- `/host/programs`
- `/admin/implementation`
- `/api/host/villages`
- `/api/implementation-status`

## 배포

GitHub `main` 브랜치에 push하면 Vercel Production 배포가 자동 생성됩니다.

현재 Production URL:

- [https://nuvio-web-blue.vercel.app](https://nuvio-web-blue.vercel.app)

배포 상태 확인:

```bash
npx vercel ls nuvio-web --scope bananaggongs-projects
```

## 다음 작업 후보

- Supabase Auth provider별 실제 Client ID/Secret 입력과 로그인 실검증
- `profiles.role`을 partner/admin으로 승격하는 운영 UI 또는 정책 추가
- 마을-프로그램 연결을 `programs.village_id` 기반으로 더 강하게 연결
- 메시지 실제 발송 채널 연동(Resend/SMS/카카오 알림톡)
- 보고서 PDF/XLSX export
- 결제 PG 연동과 입금/결제 상태 자동 확인
- Vercel wildcard domain 설정 후 서브도메인 라우팅 활성화
