# NUVIO Web

NUVIO는 로컬 체류 프로그램을 운영하는 마을/단체를 위한 공개 모집 홈페이지 네트워크이자 호스트 운영 SaaS입니다.

대외적으로는 한달살러처럼 여러 마을의 프로그램과 후기가 모이는 탐색 공간을 제공합니다. 대내적으로는 보성 전체차LAB 같은 운영자가 프로그램 등록, 신청서, 신청자 상태, 입금/결제 확인, 공지, 후기, 보고서 자료를 한곳에서 관리하는 운영 도구를 제공합니다.

NUVIO는 일반 여행객을 위한 지역축제/관광지 검색 서비스가 아닙니다. 핵심 가치는 “어디 갈까?”보다 “운영자가 모집부터 보고까지 어떻게 덜 고생하고 끝낼까?”에 있습니다.

## Product Position

| Layer | 사용자 | 역할 |
| --- | --- | --- |
| Layer 1. Public | 참가자 | 마을, 프로그램, 후기, 공지를 보고 신청한다. |
| Layer 2. Host SaaS | 마을/단체 운영자 | 홈페이지, 프로그램, 신청자, 메시지, 후기, 보고서를 관리한다. |
| Layer 3. NUVIO Ops | NUVIO 관리자 | 외부 후보, 파트너, 품질, 권한, 운영 현황을 관리한다. |

현재 제품의 기준 사례는 보성 청년마을 `전체차LAB`입니다. `/boseong`은 단순 소개 페이지가 아니라, 향후 보성 대표님이 직접 콘텐츠와 프로그램을 관리할 수 있는 운영형 홈페이지 템플릿의 첫 구현체입니다.

## Core Principles

- 공개 화면에는 운영자가 게시했거나 NUVIO가 검수한 프로그램만 노출한다.
- RSS/외부 공고는 공개 프로그램이 아니라 운영자가 검수할 후보 데이터로 다룬다.
- 마을 홈페이지는 예쁜 소개 페이지에서 끝나지 않고 신청/공지/후기/보고서 흐름으로 이어진다.
- 보성 전체차LAB에서 검증한 구조를 다른 마을에도 재사용 가능한 템플릿으로 확장한다.
- 초기에는 커스텀 도메인/서브도메인보다 `nuvio.kr/[villageSlug]` 경로형 구조를 기본으로 한다.

## Current Implementation

### Public

- 통합 프로그램 탐색
- 통합 마을 목록
- 통합 후기
- 프로그램 상세 및 신청
- 마을별 홈페이지
- 마을별 프로그램, 미디어, 후기, 약관/개인정보 페이지
- 보성 전체차LAB 전용 Figma 기반 홈페이지
- 보성 미디어 카드, 후기 필터, 전체차 오리지널 자동 전환

### Host

- 호스트 대시보드
- 프로그램 스튜디오
- 신청서 빌더
- 신청자 운영 흐름 기반 DB 저장
- 메시지 캠페인 기반 구조
- 보고서 자동화 기반 구조
- 마을 홈페이지 섹션 관리
- 보성 관리자 콘솔
- Instagram Graph API 연결/미디어 가져오기 기반

### Platform

- Supabase Auth 기반 Google, Kakao, Naver 소셜 로그인 코드
- `/me` 마이페이지와 신청 이력 조회 기반
- Supabase Postgres + Drizzle schema
- Vercel 배포
- 외부 RSS 수집과 program lead 후보화
- 구현 현황 확인용 `/admin/implementation`

## URL Strategy

초기 운영은 경로형 주소를 기본으로 사용합니다.

| 용도 | 경로 |
| --- | --- |
| NUVIO 홈 | `/` |
| 프로그램 목록 | `/programs` |
| 프로그램 상세 | `/programs/[id]` |
| 프로그램 신청 | `/programs/[id]/apply` |
| 마을 목록 | `/villages` |
| 마을 canonical 주소 | `/villages/[slug]` |
| 짧은 마을 주소 | `/[villageSlug]` |
| 마을별 프로그램 | `/[villageSlug]/[programSlug]` |
| 마을별 미디어 | `/[villageSlug]/media` |
| 마을별 후기 | `/[villageSlug]/reviews` |
| 보성 예시 | `/boseong` |

`https://nuvio.kr`이 production canonical domain입니다. Vercel 기본 URL은 fallback으로만 사용합니다.

## Important Routes

| 경로 | 설명 |
| --- | --- |
| `/` | NUVIO 공개 홈 |
| `/villages` | 로컬 홈 목록 |
| `/boseong` | 전체차LAB 공개 홈페이지 |
| `/boseong/about` | 전체차LAB 소개 |
| `/boseong/programs` | 전체차 오리지널 |
| `/boseong/media` | 전체차LAB 이야기 |
| `/boseong/reviews` | 전체차LAB 후기, 프로그램 필터 포함 |
| `/login` | 소셜 로그인 |
| `/me` | 내 프로필과 신청 이력 |
| `/host` | 호스트 운영 콘솔 |
| `/host/villages` | 마을 홈페이지 스튜디오 |
| `/host/programs` | 프로그램 스튜디오 |
| `/host/forms` | 신청서 빌더 |
| `/host/messages` | 메시지 자동화 |
| `/host/reports` | 보고서 자동화 |
| `/admin` | 관리자 콘솔 |
| `/admin/implementation` | 구현 현황 |

## Data Policy

공개 프로그램 데이터는 아래 우선순위를 따릅니다.

1. 운영자가 게시한 DB 프로그램
2. NUVIO가 검수한 curated 프로그램
3. 개발/빈 화면 방지용 seed 데이터

외부 RSS 공고는 `external_candidate` 성격의 후보입니다. 공개 홈에 바로 노출하지 않고, 운영자가 검수하여 프로그램 초안으로 전환하는 방향이 제품 원칙입니다.

관련 파일:

- `src/lib/live-announcements.ts`
- `src/lib/announcement-refresh.ts`
- `src/lib/program-leads.ts`
- `src/lib/crawled-programs.ts`
- `src/app/api/cron/refresh-announcements/route.ts`
- `vercel.json`

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres/Auth
- Drizzle ORM
- Vercel
- lucide-react

## Getting Started

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 이미 3000 포트가 사용 중이면 Next.js가 다른 포트를 제안합니다.

## Scripts

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

## Environment Variables

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
META_APP_ID=
META_APP_SECRET=
SOCIAL_TOKEN_ENCRYPTION_KEY=
```

Vercel Production, Preview, Development 환경에도 Supabase/Auth 관련 변수가 필요합니다.

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
- `village_page_sections`
- `village_media_contents`
- `host_social_connections`

원격 Supabase 프로젝트에 migration을 적용합니다.

```bash
npx supabase link --project-ref <project-ref>
npm run supabase:db:push
```

## Validation

```bash
npm run lint
npm run build
npx drizzle-kit check
```

프론트 변경 후 우선 확인할 경로:

- `/`
- `/villages`
- `/boseong`
- `/boseong/about`
- `/boseong/media`
- `/boseong/reviews`
- `/host`
- `/host/villages`
- `/host/programs`
- `/admin/implementation`

## Deployment

GitHub `main` 브랜치에 push하면 Vercel Production 배포가 자동 생성됩니다.

Production URL:

- [https://nuvio.kr](https://nuvio.kr)
- [https://nuvio-web-blue.vercel.app](https://nuvio-web-blue.vercel.app)

배포 상태 확인:

```bash
npx vercel ls nuvio-web --scope bananaggongs-projects
```

## Product Docs

- [NUVIO PRD](docs/nuvio-prd.md)
- [PRD Implementation Status](docs/prd-implementation-status-2026-05-09.md)
- [Layer Architecture](docs/nuvio-layer-architecture.md)
- [Planning Review](docs/nuvio-planning-review.md)
- [Instagram Graph API](docs/instagram-graph-api.md)
- [Production Domain](docs/production-domain.md)

## Next Priorities

1. 보성 대표님이 개발자 없이 홈페이지 섹션, 이미지, 프로그램, 후기를 수정하는 CMS 흐름 강화
2. 신청자 관리에 기수, 선정, 입금, 공지방 초대, 후기 제출 상태 추가
3. 신청서 필드와 보고서 export 필드 매핑
4. 입금 확인 1단계: 운영자 수동 체크와 CSV 업로드 매칭
5. 메시지 실제 발송 채널 연동: 이메일, SMS, 카카오 알림톡
6. 마을 템플릿을 보성 외 다른 마을로 복제 가능한 구조로 정리
