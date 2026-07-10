# 경영진 요약

## 결론

현재 working tree는 기준선보다 보안과 안정성이 크게 개선되었다. 확인된 Critical 2건과 High 5건은 모두 코드 및 migration으로 수정했고, 업로드/TipTap HTML/URL 처리와 외부 연동의 주요 Medium 위험도 보강했다.

DB 권한/RLS migration 3개와 앞선 미적용 migration 2개는 production에 적용되었고, 원격 migration history도 일치한다. 애플리케이션은 Vercel production에 배포되어 `https://nuvio.kr`에서 Ready 상태이며, 공개 경로와 비로그인 권한 경계의 읽기 전용 smoke test를 통과했다. 다만 Docker 및 역할별 테스트 계정 부재로 실제 JWT와 두 tenant 계정을 이용한 교차 tenant E2E는 후속 과제로 남아 있다.

## 가장 중요한 발견

1. 사용자가 profile role을 변경해 권한 상승할 수 있는 DB 경계가 있었다.
2. client-selected village ID/upsert로 다른 tenant 소유권을 침해할 수 있었다.
3. report 권한이 관계형 tenant ID가 아닌 이름/JSON 문자열에 의존했다.
4. 익명 신청에서 이메일 사칭, lifecycle/form 우회, duplicate oracle이 가능했다.
5. upload가 실제 decoder/container와 serverless body 제한을 충분히 반영하지 않았다.
6. public push endpoint, Sheets formula, URL/redirect, cache, body/rate-limit 경계가 불균일했다.

## 완료된 개선

- browser public-table 권한을 제거하고 profile identity/role trigger 및 active-membership RLS 추가
- village/report/application/review에 관계형 scope, transaction lock, 허용 상태 전이 적용
- 모든 server upload를 4 MiB로 제한하고 image decode/pixel/frame 및 video container 검증
- TipTap HTML과 CMS JSON의 tag/attribute/style/link/image를 write/read/render에서 정제
- push/Meta/RSS/OAuth URL과 redirect 경계 강화
- persistent rate limit, bounded JSON, pagination, PII/no-store 적용
- email/SMS/push idempotency와 provider timeout 강화
- Next.js 및 취약 transitive dependency 업데이트

## 검증 결과

- 보안 회귀 테스트: 21/21 통과
- 독립 검토: 1차 지적 4건과 후속 form API 우회 수정 후 재검토 통과, 남은 release blocker 0
- lint/typecheck/build: 통과
- host program flow: 통과
- `npm audit`: 취약점 0
- Drizzle schema check: 통과
- API raw `request.json()`: 0건
- production 배포: Ready, 홈페이지/매거진/공개 API 200 및 비로그인 host API 401
- production 보안 헤더: CSP, HSTS, frame 차단, MIME sniffing 차단 확인
- 실제 Supabase/RLS와 역할별 E2E: 환경 제약으로 미실행

## 배포 후 확인 조건

1. `anon`/`authenticated` 직접 write가 거부되고 server route 정상 쓰기가 유지되는지 검증한다.
2. host-A가 host-B village/report/program/form/application을 읽거나 바꾸지 못하는지 검증한다.
3. 로그인 신청, completed-review, 상태 conflict, upload 제한을 end-to-end로 검증한다.
4. report backfill null row와 Storage 공개/보존 정책을 운영 책임자가 확인한다.

이 조건을 통과하면 **조건부 승인에서 승인으로 전환 가능**하다. RR-003부터 RR-010은 후속 hardening backlog로 유지한다.
