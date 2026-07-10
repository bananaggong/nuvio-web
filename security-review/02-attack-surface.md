# 공격 표면 인벤토리

## 외부 진입점

| 표면 | 대표 경로 | 인증 | 주요 데이터/효과 | 점검 결과 |
| --- | --- | --- | --- | --- |
| Auth/session | `/auth/callback`, `/api/auth/*`, `/login` | 혼합 | session, redirect, account | callback redirect와 local auth 강화 |
| 공개 조회 | `/api/programs`, `/api/reviews`, 매거진/마을 페이지 | 없음 | catalog, 후기, HTML | pagination, PII 축소, read-time sanitize |
| 공개 작성 | program inquiry/support/partner submission | 없음 | PII, 메시지, 비용 | persistent rate limit, bounded JSON, generic response |
| 프로그램 신청 | `/api/program-applications` | user | PII, form answers, 상태 생성 | 확인 이메일 일치, lifecycle/form 검증, oracle 제거 |
| 사용자 API | `/api/me/**` | user | profile, 신청, 알림, upload | owner scope, same-origin, bounded body |
| Host API | `/api/host/**` | host membership | village/program/form/application/report/message | membership 및 relational village scope |
| Admin API/UI | `/admin/**`, `/api/admin/**` | admin | 전역 관리, 매거진, 감사 | server layout guard와 route guard |
| Upload | admin/host/me asset routes | 역할별 | 이미지/동영상, 공개 URL | 4 MiB, decode/container 검사, random key |
| TipTap/HTML | magazine, board, media body | 역할별 쓰기/공개 읽기 | stored HTML | write/read/render 단계 sanitizer |
| Push | `/api/me/push-subscriptions`, service worker | user | 외부 endpoint, 알림 | vendor allowlist, cap, same-origin click |
| OAuth/Meta | host Facebook connect/callback/import | owner/manager | token, remote URL | role 강화, trusted origin, paging URL 제한 |
| RSS | announcement source refresh | admin/cron | 원격 XML/URL | URL validation과 timeout; DNS race 잔존 |
| Sheets | manual dispatch | server job | 신청/연락처 export | RAW write, required config, timeout |
| Email/SMS | provider helpers, scheduled messages | server job | 외부 발송 | idempotency key, bounded error, transition guard |
| Cron | `/api/cron/**` | secret | batch mutation/발송 | secret, lock/dedupe, conditional update |

## API 규모

- API route 파일: 92개
- exported HTTP handler: 136개
- `request.json()` 직접 호출: 수정 후 0개
- 상태 변경 route는 인증된 user identity, persistent rate limit, same-origin evidence 중 해당 방어를 조합한다.

## 업로드 표면

- `src/app/api/admin/home-hero/route.ts`
- `src/app/api/admin/magazine-assets/route.ts`
- `src/app/api/host/media-assets/route.ts`
- `src/app/api/host/program-assets/route.ts`
- `src/app/api/host/village-pages/assets/route.ts`
- `src/app/api/me/avatar/route.ts`
- `src/app/api/me/review-images/route.ts`

공통 검증은 `src/lib/image-upload-security.ts`로 모았다. 이미지 signature만 보지 않고 Sharp decode/metadata와 pixel/frame 한도를 적용하며, MP4/MOV/WebM은 최소 container 구조와 brand/doctype를 확인한다.

## HTML 및 URL sink

- `src/app/magazine/[slug]/page.tsx`
- `src/components/channel-guest-board.tsx`
- `src/components/village-media-pages.tsx`

앱 소유 HTML sink는 `src/lib/magazine-content.ts`를 통해 tag, attribute, CSS, link, image URL을 제한한다. JSON-LD sink는 JSON serialization 용도이며 HTML content sink와 구분했다. village CMS의 중첩 JSON URL은 write와 read 양쪽에서 재귀적으로 정제한다.

## 데이터 노출 표면

- public program bulk list에서 연락 이메일과 전화번호를 제거했다.
- admin program-leads 응답은 `private, no-store` 및 CDN no-store로 변경했다.
- 신청 duplicate/success 결과를 동일한 202 응답으로 만들어 계정 및 신청 존재 oracle을 줄였다.
- provider 원문 오류 body와 token은 응답에 포함하지 않는다.

## 동적 검증 상태

- 로컬 정적/단위/빌드 검증: 완료
- 역할별 브라우저 E2E: 미실행, 테스트 계정과 로컬 Supabase 부재
- RLS 실제 JWT 검증: 미실행, Docker 부재
- 운영 능동 테스트: 정책상 금지

