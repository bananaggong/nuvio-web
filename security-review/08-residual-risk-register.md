# 잔여 위험 등록부

| ID | 위험 | 수준 | 상태/근거 | 담당 | 목표 시점 |
| --- | --- | --- | --- | --- | --- |
| RR-001 | 신규 권한/RLS migration 적용 후 실제 역할별 동작을 아직 smoke test하지 않음 | High | production 적용 완료, runtime 검증 잔여 | DB/Platform owner | 배포 직후 |
| RR-002 | role별 JWT/RLS/BOLA 동적 검증 부재 | High | Docker와 staging 계정 부재 | Security + QA | 배포 전 |
| RR-003 | 공개 Storage의 알려진 URL과 orphan object가 미게시 media/PII 수명주기를 약화 | Medium | SEC-016 registry enumeration은 수정, bucket lifecycle은 잔존 | Storage owner | 다음 보안 스프린트 |
| RR-004 | 4 MiB 초과 동영상 업로드 기능 부재 | Medium, 운영 | Vercel body 제한 회피 목적의 의도적 제한 | Product + Media | direct upload 설계 시 |
| RR-005 | CSP `script-src 'unsafe-inline'` 잔존 | Medium | SEC-015 Partial | Frontend/Platform | nonce 전환 릴리스 |
| RR-006 | RSS DNS rebinding race | Medium | SEC-017 Hypothesis, admin-configured source만 영향 | Platform | egress proxy 도입 시 |
| RR-007 | 후기 자격이 독립 attendance/payment/check-in을 증명하지 않음 | Medium, 신뢰 | completed application만 확인 | Product/Trust | 후기 신뢰 모델 개편 시 |
| RR-008 | provider가 idempotency key를 무시하면 network ambiguity 후 중복 발송 가능 | Medium, 운영 | app-side lock/dedupe만 보장 | Messaging owner | provider 계약 검증 시 |
| RR-009 | 일부 route의 오류 envelope/log redaction이 일관되지 않음 | Low | SEC-018 Open | Platform | 다음 안정성 스프린트 |
| RR-010 | DB-level pagination/성능 및 Cron backlog의 실제 부하 검증 부재 | Medium, 운영 | production active load 금지 | SRE | staging load test 전 |

## 배포 전 필수 조치

1. RR-001과 RR-002의 runtime smoke test를 닫는다.
2. 적용된 report backfill null row와 backup/PITR 상태를 확인한다.
3. guest/user/host-A/host-B/admin 계정으로 권한 matrix를 실행한다.
4. 신청 로그인 요구, 409 transition conflict, 4 MiB media 제한을 release note와 UI에 반영한다.
5. 초기 24시간 동안 403/409/413/415/429, Cron lag, provider timeout을 집중 관찰한다.

## 수용 가능한 임시 위험

- RR-004는 큰 동영상을 거부하는 fail-closed 동작이므로 보안상 허용 가능하나 제품 승인 필요
- RR-005는 HTML sanitizer와 `script-src-attr 'none'`이 보조하므로 단기 수용 가능
- RR-006은 source 설정 권한을 owner/admin으로 제한하고 신뢰 RSS만 등록하는 운영 절차가 있는 경우 단기 수용 가능
- RR-007/008은 사용자 신뢰와 비용 영향을 metric으로 감시하는 조건으로 단기 수용 가능
