# 통합 보안 발견사항

## 요약

| 심각도 | 수 | 코드 수정 완료 | 부분 완화/미수정 |
| --- | ---: | ---: | ---: |
| Critical | 2 | 2 | 0 |
| High | 5 | 5 | 0 |
| Medium | 10 | 8 | 2 |
| Low | 1 | 0 | 1 |
| 합계 | 18 | 14 | 4 |

모든 Critical/High는 현재 working tree에서 수정되었고, 관련 production migration 5개도 적용되었다. 실제 역할별 authorization smoke test는 별도 잔여 작업이다.

## 발견사항

### SEC-001 - Profile role mass assignment

- 상태/심각도: `CONFIRMED`, Critical, `FIXED-IN-CODE`
- CWE/OWASP: CWE-915, CWE-269 / OWASP A01 Broken Access Control
- 근거: `supabase/migrations/20260711000000_lock_browser_data_writes.sql:14-109`, `src/app/api/me/profile/route.ts`
- 실행 조건: 인증 사용자가 browser Supabase client 또는 profile update 경로에서 권위 필드를 제출
- 영향: admin/host 권한 상승, 계정 식별자 오염
- 원인: browser role의 table write grant와 identity/role 변경을 허용하는 profile 정책
- 수정: public table write revoke, profile update policy 제거, browser JWT에서 `id`, `role`, `email`, `contact_email` 변경을 막는 trigger 추가
- 검증: `tests/security-boundaries.test.ts`, migration 정적 검사 통과
- 잔여 위험: 실제 JWT/RLS 실행은 스테이징 적용 후 검증 필요

### SEC-002 - Village upsert 기반 소유권 탈취

- 상태/심각도: `CONFIRMED`, Critical, `FIXED-IN-CODE`
- CWE/OWASP: CWE-639, CWE-862 / OWASP A01
- 근거: `src/lib/village-db.ts:197-303`, `src/app/api/host/villages/route.ts:141-147`
- 실행 조건: host가 다른 village ID 또는 충돌 ID를 mutation payload에 포함
- 영향: 다른 tenant village 덮어쓰기, owner membership 획득, 하위 데이터 접근
- 원인: client-selected ID와 generic upsert, 생성과 membership 설정의 분리
- 수정: existing ID를 서버에서 해석하고, 생성/slug 충돌/owner membership/profile navigation을 advisory lock transaction으로 결합
- 검증: tenant ID를 서버가 결정하는 정적 회귀 테스트와 type/build 통과
- 잔여 위험: 두 host 계정의 실제 동시성/BOLA 테스트 필요

### SEC-003 - Mutable profile email과 browser 직접 DB write

- 상태/심각도: `CONFIRMED`, High, `FIXED-IN-CODE`
- CWE/OWASP: CWE-284, CWE-863 / OWASP A01
- 근거: `src/lib/auth-email.ts`, `src/lib/host-village-access.ts`, `src/lib/application-form-db.ts`, host form routes, 신규 browser-write migration
- 실행 조건: 사용자가 profile/contact email을 invitation 대상 주소로 변경하거나 public DB REST를 직접 호출
- 영향: pending host membership 활성화, program/form cross-tenant write
- 원인: profile row를 인증 이메일의 권위 원천으로 사용하고 과도한 table grant를 유지
- 수정: Supabase Auth의 확인된 email claim만 사용하고 browser table 권한을 제거, 탈퇴한 creator가 draft program/form을 읽거나 수정·삭제하지 못하도록 DB 함수/RLS와 `HostFormScope`를 active membership 기준으로 재정의
- 검증: confirmed email, migration, host form scope 회귀 테스트와 독립 표적 재검토 통과
- 잔여 위험: Auth provider별 email confirmation claim을 스테이징에서 확인

### SEC-004 - Report 이름/JSON fuzzy scope BOLA

- 상태/심각도: `CONFIRMED`, High, `FIXED-IN-CODE`
- CWE/OWASP: CWE-639 / OWASP API1 BOLA
- 근거: `src/app/api/host/reports/route.ts:45-229`, `src/lib/report-automation-db.ts:16-202`, `src/db/schema.ts:1438-1455`
- 실행 조건: host가 다른 project ID와 유사 village 이름/slug를 조합
- 영향: 다른 tenant report 조회, 수정, 삭제
- 원인: JSON payload와 문자열 포함 여부를 authorization surrogate로 사용
- 수정: `report_projects.village_id` NOT NULL FK/index 추가, 명시 ID/연결 program/slug/유일한 이름 순서의 cast 없는 backfill, 미해결·충돌 row가 있으면 migration 중단, 모든 query를 allowed village IDs로 scope
- 검증: Drizzle check, security boundary test, production build 통과
- 잔여 위험: backfill 결과와 RLS를 staging 데이터 snapshot으로 확인

### SEC-005 - 알려진 Next.js 의존성 취약점

- 상태/심각도: `CONFIRMED`, High, `FIXED`
- CWE/OWASP: CWE-1104 / OWASP A06 Vulnerable Components
- 근거: `package.json`, `package-lock.json`
- 관찰: 기준선 `next@16.2.4`에서 `npm audit` High가 보고됨
- 수정: `next`와 `eslint-config-next`를 `16.2.10`으로 고정하고 취약 transitive dependency override 적용
- 검증: 수정 후 `npm audit --json` 취약점 0, build/lint/typecheck 통과
- 잔여 위험: 정기 Dependabot 또는 CI audit gate 필요

### SEC-006 - 익명 신청 사칭, lifecycle 우회, form pinning과 oracle

- 상태/심각도: `CONFIRMED`, High, `FIXED-IN-CODE`
- CWE/OWASP: CWE-639, CWE-841, CWE-204 / OWASP API1/API6
- 근거: `src/app/api/program-applications/route.ts:52-131`, `src/lib/host-application-db.ts:92-187`
- 실행 조건: 임의 이메일/form/run ID로 신청하거나 duplicate 응답 차이를 비교
- 영향: 타인 명의 신청, 닫힌 프로그램 신청, 다른 program form 연결, 신청 존재 추정
- 수정: 로그인과 confirmed email 일치 필수, published/open/recruitment/run 검증, authoritative form 해석, transaction lock, success/duplicate 공통 202 synthetic receipt
- 검증: application response 회귀 테스트, host program flow, build 통과
- 호환성: 기존 익명 신청은 더 이상 허용하지 않음

### SEC-007 - 업로드 타입/decoder/container 및 함수 한도 미흡

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-434, CWE-400 / OWASP A04/A05
- 근거: `src/lib/image-upload-security.ts:3-236`와 7개 upload route
- 실행 조건: 잘린 signature-only 이미지, animation/decompression bomb, 위조 MP4/MOV/WebM, 큰 multipart 제출
- 영향: 저장형 content 위험, CPU/memory 고갈, Vercel 4.5 MiB request 실패
- 수정: 4 MiB file/4.25 MiB request, Sharp decode/metadata, 12k dimension, 40M pixels/frame, 200 frames, 100M total pixels, ISO BMFF/WebM 구조 검사, UUID path, `upsert:false`
- 검증: image/media security test 6건 및 route 정적 assertion 통과
- 잔여 위험: 큰 동영상은 검증된 direct/resumable upload 설계 전까지 지원하지 않음

### SEC-008 - Push endpoint SSRF와 fanout 자원 고갈

- 상태/심각도: `HIGH-CONFIDENCE`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-918, CWE-400 / OWASP A10
- 근거: `src/lib/browser-push.ts`, `src/lib/push-subscription-db.ts`, `src/app/api/me/push-subscriptions/route.ts`
- 실행 조건: private/custom URL을 subscription endpoint로 등록하거나 무제한 endpoint 생성
- 영향: server-side fetch, 비용/latency 증가, endpoint ownership 충돌
- 수정: FCM/Mozilla/Apple/WNS HTTPS 443 allowlist, credential/IP/custom port 차단, 사용자당 8개 cap, advisory lock, endpoint 재할당 차단, 10초 timeout
- 검증: allow/deny SSRF parser test 2건 통과

### SEC-009 - Google Sheets formula injection과 무제한 외부 호출

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-1236, CWE-400
- 근거: `src/lib/manual-dispatch-sheet.ts:103-305`
- 실행 조건: 신청자 입력이 spreadsheet formula로 해석되거나 provider가 지연/대형 오류를 반환
- 영향: 운영자 sheet에서 formula 실행, 함수 hang, 오류 데이터 반사
- 수정: 모든 write를 `valueInputOption=RAW`, spreadsheet ID 필수화, 10초 timeout, success/error/token body 제한
- 검증: security boundary test에서 `USER_ENTERED` 부재와 RAW/idempotency 확인

### SEC-010 - URL, image, OAuth redirect, CMS JSON sanitization 불일치

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-79, CWE-601, CWE-939 / OWASP A03/A10
- 근거: `src/lib/url-security.ts`, `src/lib/trusted-request-origin.ts`, `src/lib/village-page-cms.ts`, `src/lib/announcement-links.ts`
- 실행 조건: `javascript:`, parser differential, protocol-relative 또는 외부 redirect/image URL을 저장
- 영향: XSS/phishing/open redirect, 외부 tracking, legacy row 재노출
- 수정: semantic URL/image allowlist, canonical trusted origin, nested JSON write/read sanitize, RSS invalid link fallback
- 검증: content/request security test 통과

### SEC-011 - Admin PII 응답의 CDN cache 가능성

- 상태/심각도: `HIGH-CONFIDENCE`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-525 / OWASP A02
- 근거: `src/app/api/program-leads/route.ts`
- 실행 조건: 인증 응답이 shared/CDN cache에 저장되거나 재사용
- 영향: 프로그램 신청 연락처 노출
- 수정: `Cache-Control: private, no-store`와 Vercel CDN no-store 적용
- 검증: route/header 정적 검사와 build 통과

### SEC-012 - Process-local rate limit과 무제한 JSON body

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-400 / OWASP API4 Unrestricted Resource Consumption
- 근거: `src/lib/api-security.ts`와 수정된 public/me/host routes
- 실행 조건: serverless instance를 분산해 public write 또는 큰 JSON을 반복 제출
- 영향: DB/provider 비용, memory/CPU 고갈, spam
- 수정: DB-backed persistent limiter, `readJsonWithLimit`, content-length 선검사, public list page limit 100/offset 500
- 검증: API route 내 raw `request.json()` 0개, request security test 통과

### SEC-013 - 후기 자격과 출처 신뢰성 부족

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-284, CWE-345 / OWASP A01
- 근거: `supabase/migrations/20260711002000_require_completed_application_for_reviews.sql`, `src/app/api/reviews/route.ts`, 후기 UI components
- 실행 조건: 완료하지 않은 신청 또는 소유 계정이 사라진 request token으로 participant review 작성
- 영향: 허위 후기, 출처 오인
- 수정: `completed` application과 `submitted_by` 필수, token 사용 시에도 현재 authenticated owner 필수, immutable source를 공개 응답/UI에 표시
- 검증: migration assertion, type/build 통과
- 잔여 위험: 독립 attendance/payment/check-in 증명이 없어 새 계정을 이용한 조직적 Sybil은 가능

### SEC-014 - 상태 race와 중복 발송

- 상태/심각도: `CONFIRMED`, Medium, `FIXED-IN-CODE`
- CWE/OWASP: CWE-362, CWE-841
- 근거: `src/lib/host-application-db.ts:491-594`, `src/lib/scheduled-message-db.ts`, `src/lib/notification-db.ts`, provider helpers
- 실행 조건: Cron, host action, retry가 동일 row/event를 동시에 처리
- 영향: 상태 역행, 중복 email/SMS/push, hard-delete 오용
- 수정: advisory lock, compare-and-swap, 허용 transition matrix, draft-only delete/mark, deterministic dedupe/idempotency key
- 검증: idempotency security test와 host flow 통과
- 잔여 위험: provider가 idempotency 계약을 보장하지 않으면 최종 exactly-once는 보장되지 않음

### SEC-015 - CSP `unsafe-inline` 잔존

- 상태/심각도: `HIGH-CONFIDENCE`, Medium, `PARTIALLY-MITIGATED`
- CWE/OWASP: CWE-79 / OWASP A03/A05
- 근거: `next.config.ts:5-18`
- 영향: sanitizer 또는 React 경계를 우회한 script injection의 최종 완화력이 제한됨
- 현재 완화: `script-src-attr 'none'`, clickjacking/header 강화, app-owned HTML sanitizer
- 권장 수정: request nonce 기반 CSP로 이동하고 `script-src 'unsafe-inline'` 제거
- 검증: header syntax와 production build 통과

### SEC-016 - Draft asset registry의 익명 cross-tenant 열람

- 상태/심각도: `CONFIRMED`, High, `FIXED-IN-CODE`
- CWE/OWASP: CWE-200, CWE-922 / OWASP A01/A02
- 근거: 기존 `village_assets`의 `using (true)` 정책과 direct `anon` SELECT grant, upload 직후 registry 등록
- 실행 조건: 익명 사용자가 Supabase public client로 asset registry를 직접 조회
- 영향: 모든 tenant의 미게시 asset URL, metadata, 생성 시각 열람
- 수정: browser의 public table 권한을 복원하지 않고, asset read 정책을 active village member/admin으로 제한, random UUID object path 유지
- 검증: migration 회귀 테스트와 독립 재검토에서 직접 grant/creator bypass 제거 확인
- 잔여 위험: bucket 자체는 공개이므로 이미 알려진 URL 접근과 orphan 수명주기는 RR-003으로 관리

### SEC-017 - RSS fetch DNS rebinding race

- 상태/심각도: `HYPOTHESIS`, Medium, `PARTIALLY-MITIGATED`
- CWE/OWASP: CWE-918 / OWASP A10
- 근거: announcement source fetch/URL security 경로
- 실행 조건: admin이 공격자 제어 RSS host를 설정하고 DNS 응답이 검사와 연결 사이에 변경
- 영향: 내부 metadata/private service 접근 가능성
- 현재 완화: scheme/credential/port/IP 검사, timeout, admin-only source 관리
- 권장 수정: 검증된 IP에 pinning 가능한 outbound proxy/egress allowlist 또는 provider-managed fetch

### SEC-018 - 일부 generic 500의 내부 오류 상세 가능성

- 상태/심각도: `HIGH-CONFIDENCE`, Low, `OPEN`
- CWE/OWASP: CWE-209 / OWASP A05
- 근거: 전체 route 오류 처리 패턴 중 provider 경로는 정리했으나 일관된 전역 error envelope가 없음
- 영향: 예외 메시지에 schema/operation 정보가 포함될 가능성
- 권장 수정: 외부 응답은 correlation ID와 고정 문구만 반환하고 상세는 redaction된 server log로 이동
- 현재 완화: provider body/token 반사 제거, bounded error reader, production Next stack trace 기본 비노출

## 출시 판정

- 코드 기준 Critical/High 미수정 항목: 0
- 운영 효력이 없는 미적용 migration: 3개
- 판정: **코드 및 migration 적용 완료**. 운영 역할별 negative test와 오류율 관찰은 배포 후 필수 확인 항목이다.
