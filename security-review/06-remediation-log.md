# 수정 이력

보안 변경은 commit `926a22c`로 기록했다. production migration 5개를 명시적 승인 후 적용했고, Vercel production deployment `dpl_BMZmGD93jbfs1SWpMe72qgq7FP2K`가 Ready 상태로 `https://nuvio.kr`에 연결되었다. Git push/merge는 수행하지 않았다.

배포 후 읽기 전용 smoke test에서 `/`, `/magazine`, `/api/programs`는 200을 반환했고, 비로그인 `/api/host/forms`는 의도대로 401을 반환했다. CSP, HSTS, frame 차단, MIME sniffing 차단 헤더가 확인되었으며 관찰 구간에 신규 runtime error log는 없었다.

## 인증과 권한

| 변경 | 파일 | 목적 | 호환성/롤백 고려 |
| --- | --- | --- | --- |
| browser public-table 권한 제거 및 profile identity trigger | `supabase/migrations/20260711000000_lock_browser_data_writes.sql` | role mass assignment, draft asset 열람, 직접 cross-tenant DML 차단 | 기존 browser direct read/write가 있다면 중단됨. server API smoke test 필수 |
| confirmed auth email helper | `src/lib/auth-email.ts`, host access/application routes | mutable profile email을 권위 원천으로 사용하지 않음 | invitation email은 Auth confirmed email과 일치해야 함 |
| host form active-membership scope | host form/program routes, `src/lib/application-form-db.ts` | 탈퇴 creator의 draft form 조회·수정·삭제 차단 | unlinked 개인 template도 활성 workspace가 있어야 접근 가능 |
| admin layout server guard | `src/app/admin/layout.tsx` | UI 하위 경로의 일관된 admin 경계 | 비-admin은 redirect |
| local auth opt-in | `src/lib/local-dev-auth.ts`, `.env.example` | production 오작동과 실제 이메일 fallback 제거 | 개발자는 `NUVIO_ENABLE_LOCAL_DEV_AUTH=1`을 명시해야 함 |

## 테넌트와 상태 무결성

| 변경 | 파일 | 목적 | 호환성/롤백 고려 |
| --- | --- | --- | --- |
| village server-resolved update와 atomic owner create | `src/lib/village-db.ts`, host village route | client ID upsert/BOLA와 partial ownership 방지 | concurrent create는 conflict로 응답 가능 |
| report `village_id` NOT NULL FK/index/RLS와 fail-closed backfill | schema, report route/lib, `20260711001000...sql` | fuzzy name/JSON authorization과 cast/stranded row 제거 | 미해결 legacy row가 있으면 migration이 의도적으로 중단됨 |
| application lifecycle/form/identity transaction | public application route, `src/lib/host-application-db.ts` | 사칭, form pinning, closed program 신청 방지 | 익명 신청이 로그인 필수로 변경 |
| application 상태 CAS/transition matrix | host application route/lib | race와 상태 역행 방지 | stale client는 409 처리 필요 |
| completed application review gate | `20260711002000...sql`, review route/lib | 후기 출처 신뢰성 강화 | 기존 미완료 신청의 후기 작성 차단 |
| scheduled message 상태 guard | scheduled message route/lib | sent row 삭제/수동 전이와 race 방지 | draft/scheduled 외 요청은 conflict |

## 업로드와 콘텐츠

| 변경 | 파일 | 목적 | 호환성/롤백 고려 |
| --- | --- | --- | --- |
| 공통 image/media validator | `src/lib/image-upload-security.ts` | decoder bomb, 위조 container, MIME spoof 차단 | 4 MiB 초과 파일과 비표준 container 거부 |
| 모든 upload route 공통 제한 | admin/host/me upload routes | Vercel body limit 준수, 일관된 검증 | 큰 동영상 기능은 direct upload 설계 필요 |
| UUID object path와 `upsert:false` | upload routes | 예측/충돌/덮어쓰기 방지 | 기존 URL 형식과 신규 형식 공존 |
| TipTap/JSON/URL read-write sanitization | magazine/CMS/program/village/announcement libs | stored XSS, unsafe link/image, legacy content 차단 | 위험 legacy URL은 빈 값 또는 안전 fallback으로 보임 |
| asset registry membership policy | browser-write migration | 익명 draft URL 열거와 탈퇴 host 접근 차단 | 공개 bucket/known URL은 후속 private promotion 설계 필요 |
| Next image remote 제한 | `next.config.ts` | remote image redirect/내부 IP 경로 축소 | 허용되지 않은 외부 image는 렌더 실패 |

## 외부 연동과 남용 방지

| 변경 | 파일 | 목적 | 호환성/롤백 고려 |
| --- | --- | --- | --- |
| persistent rate limit와 bounded JSON | `src/lib/api-security.ts`, public/me/host routes | serverless 우회와 body DoS 감소 | Origin 없는 비브라우저 mutation client는 명시적 경로 필요 |
| push vendor allowlist/cap/lock | browser push 및 subscription DB | SSRF, fanout, ownership 충돌 방지 | 비표준 push provider는 지원하지 않음 |
| Meta exact host/page cap/owner role | Meta lib과 Facebook routes | SSRF/paging loop/OAuth token 권한 축소 | editor 역할은 연결 관리 불가 |
| trusted redirect origin | `src/lib/trusted-request-origin.ts`, auth/Meta callback | Host header open redirect 차단 | local loopback은 개발에서만 허용 |
| Sheets RAW/required config/timeout | `src/lib/manual-dispatch-sheet.ts` | formula injection과 hang 방지 | spreadsheet ID 누락 시 명시적 실패 |
| email/SMS/push idempotency와 timeout | provider/notification/scheduled message libs | retry 중복 효과와 hang 감소 | provider 지원 수준에 의존 |
| admin PII no-store와 public list PII 축소 | program leads/programs routes | shared cache와 bulk exposure 방지 | consumer가 연락처를 public list에서 읽었다면 API 계약 변경 |

## 공급망과 플랫폼

- `next` 및 `eslint-config-next`: `16.2.10` 고정
- `sharp`: `0.34.5` 직접 의존성으로 decoder 동작 고정
- `tsx`: `4.23.0` 고정
- `esbuild: 0.28.1`, `postcss: 8.5.10` override
- CSP에 `script-src-attr 'none'`, HSTS, `poweredByHeader:false`, cross-domain policy header 추가
- Next image fetch redirect 0, local IP 금지, response 10 MiB 제한

## Migration 적용 순서

1. 사전 백업과 `report_projects` null/mapping 현황 확인
2. `20260711000000_lock_browser_data_writes.sql`
3. `20260711001000_scope_report_projects_to_villages.sql`
4. `20260711002000_require_completed_application_for_reviews.sql`
5. role별 negative test와 application/review happy path 실행
6. app 코드 배포 후 403/409/413/415/429와 Cron metric 관찰

## Rollback 원칙

- migration을 즉시 역적용하지 않는다. 권한 grant 복원은 SEC-001/003을 재개방할 수 있다.
- app rollback이 필요하면 신규 DB column/trigger는 호환 상태로 유지하고 이전 app의 direct browser write 의존 여부를 먼저 확인한다.
- report `village_id`를 제거하기 전 신규 데이터의 tenant mapping을 보존한다.
- application 로그인 요구를 되돌릴 경우 익명 identity proof를 별도로 설계하지 않으면 SEC-006이 재발한다.
