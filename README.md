# NUVIO Web

NUVIO는 국내 여행지원금, 한달살기, 워케이션, 반값여행, 로컬 프로젝트 정보를 탐색하고 신청부터 호스트 운영, 메시지, 결과보고까지 이어주는 여행지원금 운영 플랫폼입니다.

현재 구현 방향은 단순 소개 사이트가 아니라 외부 공고 수집, 프로그램 등록, 신청서 구성, 신청자 운영, 메시지 캠페인, 결과보고 자동화까지 하나의 흐름으로 이어지는 SaaS형 서비스입니다.

## 주요 기능

- 공개 프로그램 목록, 검색, 필터, 상세 페이지
- Supabase `programs.published_at` 기준 공개 프로그램 노출
- 호스트 프로그램 스튜디오와 프로그램 초안 DB 저장
- 호스트 신청서 빌더와 공개 신청 페이지 템플릿 반영
- 프로그램 신청 DB 저장과 호스트 신청자 파이프라인
- Supabase Auth 기반 Google, Kakao, Naver 소셜 로그인 코드
- `/me` 계정 페이지의 세션, 프로필, 신청 내역 조회
- 외부 RSS 공고 수집, 프로그램 후보 생성, 승인 시 초안 생성
- 메시지 캠페인, 결과보고 프로젝트 DB 저장
- 구현 현황 확인판과 JSON 상태 API

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

로컬 개발에는 `.env.local`을 사용합니다. 실제 값은 커밋하지 않습니다.

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

## 소셜 로그인

Supabase Auth OAuth 흐름을 사용합니다.

- Google: Supabase 내장 `google` provider
- Kakao: Supabase 내장 `kakao` provider
- Naver: Supabase Custom OAuth/OIDC provider, 기본 provider id는 `custom:naver`

구현 파일:

- 로그인 UI: `src/components/login-panel.tsx`
- OAuth provider 설정: `src/lib/auth-providers.ts`
- OAuth callback: `src/app/auth/callback/route.ts`
- 세션 API: `src/app/api/auth/session/route.ts`
- 로그아웃 API: `src/app/api/auth/logout/route.ts`
- 프로필 API: `src/app/api/me/profile/route.ts`
- 프로필 DB sync: `src/lib/auth-profile-db.ts`

Supabase Dashboard에서 각 provider의 Client ID/Secret을 등록하고 Auth redirect URL allow list에 아래 URL을 추가합니다.

```bash
http://localhost:3000/auth/callback
https://nuvio-web-blue.vercel.app/auth/callback
```

Naver provider identifier가 `custom:naver`가 아니라면 `NEXT_PUBLIC_SUPABASE_NAVER_PROVIDER` 값을 함께 바꿉니다.

## Supabase

Supabase는 운영 가능한 Postgres 백엔드로 사용합니다. 스키마는 SQL migration과 Drizzle schema를 함께 관리합니다.

- Supabase CLI 설정: `supabase/config.toml`
- Migration: `supabase/migrations/*`
- Seed: `supabase/seed.sql`
- Drizzle schema: `src/db/schema.ts`
- DB client: `src/db/client.ts`

주요 테이블:

- `profiles`
- `programs`
- `program_applications`
- `application_status_events`
- `program_application_forms`
- `message_campaigns`
- `message_templates`
- `scheduled_messages`
- `report_projects`
- `external_announcement_sources`
- `external_announcements`
- `program_leads`
- `program_lead_decisions`

원격 Supabase 프로젝트에 migration을 적용할 때:

```bash
npx supabase link --project-ref <project-ref>
npm run supabase:db:push
```

## 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 프로그램 탐색 |
| `/programs/[id]` | 프로그램 상세 |
| `/programs/[id]/apply` | 프로그램 신청 |
| `/announcements` | 공지 목록 |
| `/reviews` | 후기 목록 |
| `/partners/apply` | 파트너 제안 |
| `/login` | 소셜 로그인 |
| `/me` | 마이페이지 |
| `/host` | 호스트 운영 콘솔 |
| `/host/programs` | 프로그램 스튜디오 |
| `/host/forms` | 신청서 빌더 |
| `/host/messages` | 메시지 자동화 센터 |
| `/host/reports` | 보고 자동화 센터 |
| `/admin` | 관리자 콘솔 |
| `/admin/implementation` | 구현 현황 확인판 |

## 주요 API

| API | 설명 |
| --- | --- |
| `GET /api/auth/providers` | 소셜 로그인 provider 목록 |
| `GET /api/auth/session` | 현재 Supabase 세션/프로필 조회 |
| `POST /api/auth/logout` | 로그아웃 |
| `GET, PATCH /api/me/profile` | 내 프로필 조회/수정 |
| `GET /api/programs` | 공개 프로그램 JSON |
| `GET /api/reviews` | 후기 JSON |
| `GET /api/announcements` | 내부/외부 공지 JSON |
| `GET, POST, PATCH /api/announcement-sources` | 외부 공고 소스 조회/추가/활성화 |
| `GET /api/cron/refresh-announcements` | Cron 기반 외부 공고 수집/DB 적재 |
| `GET, POST /api/program-leads` | 외부 공고 기반 후보 조회, 승인/반려 |
| `POST /api/program-applications` | 프로그램 신청 저장 |
| `GET /api/host/applications` | 호스트 신청자 목록 |
| `PATCH /api/host/applications/[id]` | 신청 상태 변경 |
| `GET, POST /api/host/programs` | 호스트 프로그램 초안 조회/저장 |
| `GET, POST /api/host/forms` | 신청서 템플릿 조회/저장 |
| `GET, POST /api/host/message-campaigns` | 메시지 캠페인 조회/저장 |
| `GET, POST /api/host/reports` | 보고 프로젝트 조회/저장 |
| `GET /api/implementation-status` | 구현 현황 JSON |

## 구현 확인판

현재 구현된 기능과 직접 확인할 수 있는 경로는 아래 화면과 API에서 확인합니다.

- `/admin/implementation` - 기능별 구현 상태, 확인 링크, 검증 방법
- `GET /api/implementation-status` - 동일 내용을 JSON으로 반환

이번 단계에서 구현된 주요 연결:

- 공개 프로그램 목록/상세/신청 페이지가 Supabase `programs.published_at` 기준 데이터를 우선 노출
- 호스트가 만든 신청서 템플릿이 공개 신청 페이지에 반영되고 `program_applications.form_id`와 답변으로 저장
- `/me`가 Supabase Auth 세션, `profiles`, DB 신청 내역을 함께 표시
- 호스트 화면에 현재 로그인 계정 role 상태 표시
- `/api/program-leads` POST 승인/반려 처리와 승인 시 호스트 프로그램 초안 생성
- Vercel Cron 기반 외부 공고 수집, DB 적재, 후보 적재

## 외부 공고 수집

`/api/announcements`는 내부 공지와 DB에 저장된 외부 RSS 공고를 함께 반환합니다. Vercel Cron은 `/api/cron/refresh-announcements`를 15분마다 호출해 외부 소스를 수집하고 `external_announcements`, `program_leads`에 적재합니다.

Cron 요청은 `Authorization: Bearer $CRON_SECRET`로 보호합니다. 프로덕션 Vercel 환경 변수에 `CRON_SECRET`을 반드시 설정해야 합니다.

기본 소스는 `src/lib/announcement-sources.ts`에 있고, 추가 소스는 관리자 콘솔의 외부 공고 소스 화면 또는 `EXTERNAL_ANNOUNCEMENT_SOURCES` 환경 변수로 넣을 수 있습니다.

관련 파일:

- `src/lib/live-announcements.ts`
- `src/lib/announcement-refresh.ts`
- `src/lib/external-announcement-db.ts`
- `src/lib/announcement-sources.ts`
- `src/lib/announcement-links.ts`
- `src/components/live-announcement-strip.tsx`
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

Supabase 연결 후에는 공개/호스트 API에 테스트 데이터를 POST하고 GET으로 확인한 뒤, DB에서 테스트 데이터를 정리합니다.

최근 검증 대상:

- `/`
- `/programs/1001`
- `/programs/1001/apply`
- `/me`
- `/host`
- `/host/programs`
- `/host/forms`
- `/admin/implementation`
- `/api/programs`
- `/api/program-leads`
- `/api/announcement-sources`
- `/api/cron/refresh-announcements`
- `/api/implementation-status`
- `/api/host/applications`
- `/api/host/programs`
- `/api/host/forms`

## 배포

GitHub `main` 브랜치에 push하면 Vercel Production 배포가 자동으로 생성됩니다.

현재 프로덕션 URL:

- [https://nuvio-web-blue.vercel.app](https://nuvio-web-blue.vercel.app)

배포 상태 확인:

```bash
npx vercel ls nuvio-web --scope bananaggongs-projects
```

## 다음 작업 후보

- Supabase Auth provider별 실제 Client ID/Secret 입력과 redirect URL 최종 검증
- `profiles.role`을 partner/admin으로 승격하는 운영자 UI 또는 정책 추가
- 메시지 실제 발송 채널(Resend/SMS/카카오 알림톡) 연동
- 보고서 PDF/XLSX export
- 외부 공고 소스 확대와 RSS 없는 기관 사이트 파서 추가
