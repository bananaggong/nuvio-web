# 보안 및 안정성 점검 범위

## 점검 기준

- 점검일: 2026-07-11
- 저장소: `C:\projects\NUVIO\nuvio-web`
- 기준 커밋: `f05a38846e9a4edd89c22c09925442be6eea1716` (`main`)
- 대상 스택: Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres/Storage, Drizzle ORM, Vercel Functions/Cron, TipTap, `sanitize-html`, web-push
- 정적 인벤토리: App Router 페이지 113개, API route 파일 92개, HTTP handler 136개

## 포함 범위

- 인증, 세션, OAuth callback, 로컬 개발 인증
- `guest`, `user`, `host/partner`, `admin` 역할과 마을 단위 테넌트 경계
- 프로그램 신청, 신청 상태 전이, 후기 자격 및 출처, 문의와 메시지
- 이미지/동영상 업로드 API, Supabase Storage object path와 공개 URL
- 매거진/게시판 TipTap HTML 저장 및 렌더링 경로
- JSON body 크기, URL/image sanitization, CSRF, XSS, SSRF, open redirect
- push subscription, 이메일/SMS, Google Sheets, Meta Graph, RSS 연동
- Cron 중복 실행, idempotency, race condition, timeout, pagination, cache
- 의존성, 보안 헤더, Vercel/Next 설정, Supabase migration 및 RLS

## 제외 범위

- 운영 환경에 대한 능동 공격, 부하, 계정 접근, 데이터 변경
- 실결제, 실제 메시지/알림 발송, 실제 고객 데이터 열람
- 운영 Supabase/Vercel 설정 변경, migration 적용, 배포, push, merge
- Docker가 필요한 로컬 Supabase 통합 실행

## 테스트 환경과 안전 한계

- 로컬 소스와 로컬 빌드만 능동 검증했다.
- 운영 도메인은 구조 확인 이외의 능동 요청을 하지 않았다.
- `.env.local`의 값이나 secret은 보고서에 기록하지 않았다.
- 운영/스테이징 테스트 계정이 없어 역할별 브라우저 E2E는 코드 및 회귀 테스트로 대체했다.
- Docker daemon이 없어 `npm run supabase:start`가 실행되지 않았다. 따라서 새 RLS/trigger/migration의 실제 Postgres 실행 검증은 배포 전 스테이징에서 필수다.
- production migration 5개는 명시적 승인 후 session pooler를 통해 적용했고, 원격 migration history가 local과 일치함을 확인했다. 로컬 Supabase 기반 재현 테스트는 여전히 Docker 부재로 불가하다.

## 주요 가정

- production canonical origin은 `https://nuvio.kr`이다.
- 브라우저는 Supabase public client key를 가질 수 있으므로 DB 권한은 공격자 통제 입력으로 간주한다.
- server-only DB URL과 service role key는 Vercel server runtime에만 존재한다.
- 외부 제공자 API는 지연, 중복 응답, 부분 실패가 가능하다.
- server upload는 Vercel request body 제한보다 작아야 하며 현재 4 MiB 파일만 지원한다.

## 확정 상태 정의

- `CONFIRMED`: 코드 경로, migration 또는 실행 결과로 재현/입증됨
- `HIGH-CONFIDENCE`: 코드 경로가 명확하나 외부 환경 제약으로 실행하지 못함
- `HYPOTHESIS`: 추가 환경 정보나 동적 검증이 필요함

## 차단 조건

다음 조건을 충족하기 전에는 운영 출시를 승인하지 않는다.

1. 신규 migration 3개를 스테이징에 순서대로 적용한다.
2. `anon`, `authenticated` 역할의 직접 쓰기 차단과 profile 보호 trigger를 실제 JWT로 검증한다.
3. 서로 다른 두 host 계정으로 village/report/application BOLA negative test를 통과한다.
4. 로그인 필수로 변경된 프로그램 신청 흐름과 4 MiB 업로드 제한을 제품에서 승인한다.
