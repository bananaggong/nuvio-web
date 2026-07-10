# 위협 모델

## 보호 자산

1. 사용자 계정, 확인된 이메일, role과 host membership
2. village/program/form/application/report의 테넌트 소유권
3. 신청 답변, 연락처, 문의/메시지, 후기 moderation 정보
4. 공개 사이트에 렌더링되는 HTML, 이미지, link
5. OAuth/service account/provider credential
6. 메시지, 이메일, SMS, push 발송 비용과 평판
7. Cron과 보고서 상태의 정확성 및 가용성

## 공격자

- 인증되지 않은 인터넷 사용자와 자동화 bot
- 정상 계정을 가진 악성 user
- 한 village 권한만 가진 악성 또는 탈취된 host
- 브라우저 public Supabase key로 직접 REST/SQL API를 호출하는 사용자
- 악성 RSS/Meta/Push endpoint 또는 손상된 외부 provider
- 저장된 legacy content에 위험 URL/HTML을 남긴 과거 입력

## 우선 공격 경로

### P1. Profile mass assignment -> Admin 권한 상승

기존 browser write와 profile update 정책을 조합해 `role`, `id`, 이메일 계열 필드를 바꾸는 경로다. migration에서 browser write grant를 제거하고 trigger로 identity 필드를 차단했다. SEC-001/003.

### P2. 임의 village ID -> 소유권 탈취 및 cross-tenant 쓰기

클라이언트가 선택한 ID를 upsert하거나 program/form을 직접 삽입하면 다른 tenant 객체를 덮어쓸 수 있었다. 서버가 existing village ID를 결정하고 transaction 안에서 생성/owner membership을 결합하도록 수정했다. SEC-002.

### P3. 이름/문자열 일치 -> Report BOLA

report payload의 이름 또는 JSON 문자열 포함 여부로 접근을 추정하면 다른 village report를 조회/수정할 수 있다. 관계형 `village_id` FK와 허용 ID query scope로 교체했다. SEC-004.

### P4. 익명 신청/임의 form -> 계정 사칭, 상태 오염, 존재 oracle

임의 이메일과 form ID를 보내 다른 프로그램의 form을 연결하거나 duplicate 응답으로 존재를 추정할 수 있었다. 로그인 확인 이메일, program lifecycle, authoritative form, 동일 202 응답을 적용했다. SEC-006.

### P5. Polyglot/decompression media -> XSS 또는 함수 자원 고갈

MIME과 magic byte만 믿으면 잘린 이미지, oversized decode, animation bomb, 위조 video container가 저장될 수 있다. decode/metadata, pixel/frame/total-pixel, container 구조, 4 MiB 경계를 적용했다. SEC-007.

### P6. Stored HTML/URL -> XSS, phishing, open redirect

TipTap HTML과 중첩 CMS JSON, RSS link, profile/avatar URL이 브라우저 sink로 흐르는 경로다. 저장 전과 읽기/렌더링 시점 모두 scheme/host/tag/attribute/style을 제한한다. SEC-010/015.

### P7. Push/RSS/Meta URL -> SSRF 및 비용 고갈

임의 push endpoint나 paging URL, RSS URL이 서버 fetch로 이어지는 경로다. push는 vendor host/443 allowlist, Meta는 exact Graph host와 page cap을 적용했다. RSS는 IP/DNS 검사와 timeout이 있으나 DNS rebinding race는 잔존한다. SEC-008/017.

### P8. Retry/race -> 중복 발송 및 상태 역행

Cron과 수동 action이 동시에 application/message 상태를 갱신하면 lost update와 중복 발송이 가능하다. advisory lock, compare-and-swap, 허용 상태 전이, provider idempotency key를 추가했다. SEC-014.

## STRIDE 요약

| 범주 | 대표 위협 | 주요 방어 | 남은 공백 |
| --- | --- | --- | --- |
| Spoofing | 이메일 사칭, local dev auth 오용 | confirmed claim, 명시적 opt-in | 실제 계정 E2E 미검증 |
| Tampering | role/tenant/report/application 조작 | revoke/RLS/trigger, relational scope, transaction | migration 미적용 상태 |
| Repudiation | 상태 변경과 발송 추적 부족 | audit/event row, deterministic key | provider 최종 수신 증명 부재 |
| Information disclosure | PII bulk 응답, cache, 오류 원문 | field omission, no-store, bounded errors | 일부 generic 500 정리 필요 |
| Denial of service | body/upload/decode/paging/push fanout | size/pixel/page/cap/rate limit/timeout | direct large upload pipeline 부재 |
| Elevation of privilege | profile role, admin layout, BOLA | server role guard, trigger, tenant scope | staging RLS 실행 검증 필요 |

## 방어 우회 관점

- route guard만으로 끝내지 않고 DB query에 allowed tenant ID를 포함했다.
- write-time sanitizer만 믿지 않고 legacy row를 read-time에도 정제한다.
- `Content-Type`만 믿지 않고 실제 이미지 decoder와 media container parser를 사용한다.
- 응답 cache header만 설정하지 않고 Vercel CDN용 no-store까지 함께 지정한다.
- provider idempotency를 요청 key 하나로 완전한 exactly-once로 간주하지 않는다. 잔여 위험은 별도로 관리한다.

