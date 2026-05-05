# NUVIO Web

NUVIO는 국내 여행지원금, 한달살기, 워케이션, 반값여행, 로컬 프로젝트 정보를 탐색하고 신청부터 운영 정산까지 이어주는 여행지원금 플랫폼입니다.

현재 구현 방향은 단순 소개형 사이트가 아니라, 외부 공고 수집, 프로그램 등록, 신청서 구성, 신청자 운영, 메시지 캠페인, 결과보고서 생성까지 한 흐름으로 이어지는 운영형 MVP입니다.

## 주요 기능

- 여행지원금 프로그램 목록, 검색, 필터, 상세 페이지
- 프로그램 신청 페이지와 Supabase 기반 신청 저장
- 실시간 공고 API와 외부 RSS 공고 수집 기반 후보 생성
- 호스트 운영 콘솔
- 프로그램 스튜디오: 호스트 프로그램 초안 DB 저장
- 신청서 빌더: 신청서 템플릿 DB 저장
- 신청자 운영: 신청 상태 변경과 상태 이력 저장
- 메시지 자동화 센터: 캠페인 설정 DB 저장, 실제 신청자 API 기반 수신자 미리보기
- 보고서 자동화 센터: 결과보고서 프로젝트 DB 저장, 신청자/정산/증빙 데이터 기반 초안 생성
- 마이페이지, 후기, 공지, 파트너 제안 화면

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres
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
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_DATABASE_URL=
ANNOUNCEMENT_REFRESH_SECONDS=300
PROGRAM_LEAD_MIN_SCORE=2
DISABLED_ANNOUNCEMENT_SOURCE_IDS=
EXTERNAL_ANNOUNCEMENT_SOURCES=
```

Vercel Production, Preview, Development 환경에도 같은 Supabase 연결 변수가 필요합니다.

## Supabase

Supabase는 운영 가능한 Postgres 백엔드로 사용합니다. 스키마는 SQL 마이그레이션과 Drizzle 스키마를 함께 관리합니다.

- Supabase CLI 설정: `supabase/config.toml`
- 마이그레이션: `supabase/migrations/*`
- Seed: `supabase/seed.sql`
- Drizzle 스키마: `src/db/schema.ts`
- DB 클라이언트: `src/db/client.ts`

적용된 주요 테이블:

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

원격 Supabase 프로젝트에 마이그레이션을 적용할 때:

```bash
npx supabase link --project-ref <project-ref>
npm run supabase:db:push
```

## 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 프로그램 탐색 홈 |
| `/programs/[id]` | 프로그램 상세 |
| `/programs/[id]/apply` | 프로그램 신청 |
| `/announcements` | 공지 목록 |
| `/reviews` | 후기 목록 |
| `/partners/apply` | 파트너 제안 |
| `/host` | 호스트 운영 콘솔 |
| `/host/programs` | 프로그램 스튜디오 |
| `/host/forms` | 신청서 빌더 |
| `/host/messages` | 메시지 자동화 센터 |
| `/host/reports` | 보고서 자동화 센터 |
| `/me` | 마이페이지 |
| `/admin` | 관리자 콘솔 |

## 주요 API

| API | 설명 |
| --- | --- |
| `GET /api/programs` | 프로그램 JSON |
| `GET /api/reviews` | 후기 JSON |
| `GET /api/announcements` | 내부/외부 공지 JSON |
| `GET /api/program-leads` | 외부 공고 기반 프로그램 후보 |
| `POST /api/program-applications` | 프로그램 신청 저장 |
| `GET /api/host/applications` | 호스트 신청자 목록 |
| `PATCH /api/host/applications/[id]` | 신청 상태 변경 |
| `GET, POST /api/host/programs` | 호스트 프로그램 초안 조회/저장 |
| `GET, POST /api/host/forms` | 신청서 템플릿 조회/저장 |
| `GET, POST /api/host/message-campaigns` | 메시지 캠페인 조회/저장 |
| `GET, POST /api/host/reports` | 보고서 프로젝트 조회/저장 |

## 외부 공고 수집

`/api/announcements`는 내부 공지와 외부 RSS 공고를 함께 반환합니다. 기본 소스는 `src/lib/announcement-sources.ts`에 있고, 추가 소스는 `EXTERNAL_ANNOUNCEMENT_SOURCES` 환경 변수로 넣을 수 있습니다.

관련 파일:

- `src/lib/live-announcements.ts`
- `src/lib/announcement-sources.ts`
- `src/lib/announcement-links.ts`
- `src/components/live-announcement-strip.tsx`

## 검증

기본 검증:

```bash
npm run lint
npm run build
npx drizzle-kit check
```

Supabase 연결 후 API 저장 검증은 각 운영 API에 테스트 데이터를 POST하고, GET으로 확인한 뒤 DB에서 테스트 데이터를 정리하는 방식으로 수행합니다.

최근 검증된 프로덕션 경로:

- `/`
- `/host/programs`
- `/host/forms`
- `/host/messages`
- `/host/reports`
- `/api/host/programs`
- `/api/host/forms`
- `/api/host/message-campaigns`
- `/api/host/reports`
- `/api/host/applications`

## 배포

GitHub `main` 브랜치에 push하면 Vercel Production 배포가 자동으로 생성됩니다.

현재 프로덕션 URL:

- [https://nuvio-web-blue.vercel.app](https://nuvio-web-blue.vercel.app)

배포 상태 확인:

```bash
npx vercel ls nuvio-web --scope bananaggongs-projects
```

## 다음 작업 후보

- 공개 프로그램 목록/상세를 DB 기반으로 전환
- 호스트가 저장한 프로그램을 사용자 화면에 즉시 노출
- 신청서 템플릿을 실제 신청 페이지와 연결
- Auth/RLS 정책 정교화
- 메시지 발송 공급자 연동
- 보고서 PDF/XLSX export
- 외부 공고 후보 승인 후 프로그램 자동 생성
