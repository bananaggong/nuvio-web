# 안정성 및 복원력 점검

## 현재 방어

| 영역 | 현재 구현 | 평가 |
| --- | --- | --- |
| DB 연결 | `src/db/client.ts`의 instance당 pool `max: 1` | serverless connection 폭증 억제에 유리하나 긴 query가 해당 instance 요청을 직렬화할 수 있음 |
| Transaction | village 생성, 신청 생성/전이, review, push registration에 transaction/advisory lock | race와 partial update를 유의미하게 감소 |
| Cron | notification, review request, scheduled SMS에 전역 advisory lock | 동시 Cron 중복 처리 방지 |
| Provider timeout | RSS 5초, Google/Meta/email/SMS/push에 명시적 timeout | 외부 장애의 함수 점유 제한 |
| Retry safety | deterministic dedupe/idempotency key, 조건부 status update | 중복 효과 감소, provider 계약에 따라 exactly-once는 아님 |
| Input pressure | bounded JSON, upload 4 MiB, image pixel/frame, pagination, push cap | memory/CPU/비용 고갈 경로 축소 |
| Graceful degradation | provider 오류 body를 축약하고 내부 상태를 성공으로 오인하지 않음 | 정보 노출과 연쇄 실패 감소 |

## 주요 실패 모드

### DB 및 migration

- 신규 `report_projects.village_id` backfill이 legacy JSON의 유효한 UUID만 옮긴다. 매핑되지 않은 row는 host scope에서 보이지 않을 수 있으므로 적용 전 null row 수를 점검해야 한다.
- browser write revoke는 기존 브라우저 직접 mutation 기능을 의도적으로 중단한다. 모든 쓰기가 server route를 통하는지 staging smoke test가 필요하다.
- migration 적용 중 장시간 lock이 발생할 가능성은 낮지만, 운영 row 수와 실행 계획을 사전 확인하지 못했다.

### 외부 제공자

- timeout은 함수 hang을 막지만 자동 retry/backoff/jitter 정책은 provider마다 일관되지 않다.
- email/SMS provider가 idempotency header를 무시하면 network ambiguity 후 중복 발송이 가능하다.
- Meta paging은 10 page cap으로 무한 loop를 막지만 대규모 import는 일부만 반영될 수 있다.
- RSS fetch는 외부 host 장애 시 최신 공고가 지연될 수 있으며 stale cache/last-known-good 정책이 명시적이지 않다.

### 업로드

- server upload는 Vercel request 제한을 고려해 4 MiB로 통일했다. 기존 4 MiB 초과 동영상 UX는 실패한다.
- Storage object 생성과 DB metadata 저장이 하나의 원자 transaction이 아니므로 후속 DB 실패 시 orphan object가 남을 수 있다.
- 공개 bucket은 URL을 아는 사용자가 origin 앱을 거치지 않고 object를 조회할 수 있다.

### 성능과 backpressure

- public program list는 메모리에서 전체 목록을 받은 뒤 slice할 가능성이 있어 데이터 증가 시 DB-level pagination으로 이동해야 한다.
- 일부 host aggregate는 여러 query를 순차 실행할 수 있다. 실제 p95와 query count 계측 없이 N+1 부재를 완전히 입증하지 못했다.
- persistent rate limit 자체가 DB에 의존하므로 DB 장애 시 fail-open/fail-closed 정책과 오류율을 관찰해야 한다.

## 권장 SLO

공식 SLO가 없으므로 다음을 초기 기준으로 제안한다.

- 월간 HTTP 가용성: 99.9%
- 읽기 API p95: 500 ms 이하, p99: 1.5 s 이하
- 상태 변경 API p95: 1 s 이하, provider 연동 API p95: 3 s 이하
- Cron 성공률: 99.5% 이상, 동일 dedupe key 중복 효과 0건
- application/report tenant authorization 실패: 의도하지 않은 2xx 0건
- upload validation 5xx 비율: 0.1% 이하, 413/415는 별도 product metric

## 권장 관측과 경보

1. correlation ID를 request, DB event, provider request에 연결한다.
2. 로그는 user ID를 비가역 hash 또는 내부 UUID로 기록하고 이메일/전화/token/body는 redaction한다.
3. `401/403/409/413/415/429`를 5xx와 분리해 대시보드화한다.
4. Cron lock 획득 실패, pending age, provider timeout, duplicate suppression 수를 metric으로 남긴다.
5. `report_projects.village_id IS NULL`, orphan storage object, public bucket object age를 정기 점검한다.
6. DB pool wait, query duration, connection error를 function region별로 관찰한다.

## 복구 및 롤백

- 코드 rollback만으로 browser DB grant가 자동 복원되지 않는다. DB migration과 app rollback은 별도 runbook으로 관리해야 한다.
- report FK migration rollback 전 신규 row의 `village_id`를 legacy payload로 보존했는지 확인한다.
- dependency rollback은 High advisory를 다시 도입할 수 있어 허용하지 않는다.
- 4 MiB upload 제한 완화는 Vercel server route가 아니라 검증된 direct/resumable pipeline 출시와 함께 수행한다.
- 백업/restore와 PITR 설정은 저장소에서 확인할 수 없었으므로 Supabase 운영 설정의 별도 증빙이 필요하다.

