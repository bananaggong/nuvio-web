# 검증 매트릭스

## 실행 결과

| 검증 영역 | 명령/방법 | 결과 | 비고 |
| --- | --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | PASS | 오류 0 |
| Lint | `npm run lint` | PASS | 오류/경고 0 |
| Production build | `npm run build` | PASS | Next 16.2.10, 155 static page 생성 포함 |
| Security unit/regression | `npm run test:security` | PASS | 21/21 |
| Host program flow | `npm run verify:host-program-flow` | PASS | 핵심 host program 계약 검증 |
| Dependency audit | `npm audit --json` | PASS | Critical/High/Medium/Low 0 |
| Dependency tree | `npm ls --depth=0` | PASS | exit 0; optional WASM helper의 extraneous 표시는 node_modules 정리 대상 |
| Drizzle schema | `npx drizzle-kit check` | PASS | schema consistency 정상 |
| Unbounded JSON parser | `rg ... 'request\\.json\\('` | PASS | API route 0건 |
| Patch whitespace | `git diff --check` | PASS | whitespace error 0; Windows line-ending warning만 존재 |
| Supabase local | `npm run supabase:start` | BLOCKED | Docker daemon 부재 |
| Supabase production migrations | `npx supabase db push --db-url <production pooler> --include-all` 및 `migration list` | PASS | 5개 적용, local/remote history 일치 |
| Browser overflow | `npm run verify:overflow -- /host/villages` | NOT RUN | local Supabase/test account 부재, `.env.local`의 외부 환경 오접속 방지 |
| Production active test | 실행하지 않음 | NOT ALLOWED | 범위 정책 준수 |

## 보안 테스트 세부

| 테스트 | 방어 속성 |
| --- | --- |
| push vendor endpoint allow/deny 2건 | SSRF parser/host/port/credential/IP 차단 |
| image/media 6건 | decoder metadata, full decode, truncated image, MP4/MOV brand, box truncation, WebM structure |
| TipTap HTML | executable tag/attribute/style과 unsafe URL 제거 |
| Stored HTML sink wiring | 매거진, 게시판, media 렌더러의 최종 sanitizer 경계 유지 |
| village CMS JSON | nested link/image read-write sanitization |
| internal redirect | parser differential과 external URL 차단 |
| same-origin mutation | Origin/Referer/Sec-Fetch-Site 증거 요구 |
| confirmed email | mutable profile email invitation 우회 방지 |
| DB migration assertion | browser table 권한 제거, profile trigger, active membership policy 존재 |
| Report migration | cast 없는 다단계 backfill, unresolved fail-closed, NOT NULL, schema 일치 |
| Host form revocation | GET/POST/DELETE와 program caller가 active `HostFormScope` 사용 |
| Independent review | 1차 지적 4건 수정 및 표적 재검토 PASS; 남은 release blocker 없음 |
| tenant identifiers | village/report ID 서버 결정 및 relational scope |
| application response | DB application record/oracle 비노출 |
| external dispatch | Sheets RAW와 notification idempotency |
| bounded JSON | 모든 API route의 공통 parser 사용 |

## Critical/High 수정 검증 상태

| ID | 정적/단위 | Build | DB/역할 E2E | 판정 |
| --- | --- | --- | --- | --- |
| SEC-001 | PASS | PASS | PENDING | migration 적용 완료, 실제 JWT smoke test 필요 |
| SEC-002 | PASS | PASS | PENDING | migration 적용 완료, 두 host 계정 필요 |
| SEC-003 | PASS | PASS | PENDING | migration/API 적용 완료, JWT/RLS 검증 필요 |
| SEC-004 | PASS | PASS | PENDING | backfill 적용 완료, tenant negative test 필요 |
| SEC-005 | PASS | PASS | 해당 없음 | 완료 |
| SEC-006 | PASS | PASS | BLOCKED | 로그인 신청 UX 및 DB transaction 검증 필요 |

## 미검증 공백

- migration SQL의 실제 적용/rollback 시간과 lock 영향
- Supabase RLS에서 `anon`, `authenticated`, service role의 실제 차이
- 두 tenant 계정의 BOLA/IDOR negative matrix
- OAuth provider 실제 callback 및 token refresh
- 실제 provider idempotency/timeout/retry 동작
- Storage bucket policy와 object retention
- p95/p99, connection wait, Cron backlog, 대규모 데이터 N+1
- 백업/PITR/restore와 observability 운영 설정
