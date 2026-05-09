# PRD 구현 현황

작성일: 2026-05-09
기준 문서: `docs/nuvio-prd.md`
대상 제품: NUVIO Web, 전체차LAB 템플릿, 호스트 운영 SaaS

## 1. 요약

전체차LAB은 현재 NUVIO의 첫 번째 마을 홈페이지 템플릿 기준안으로 볼 수 있다. 공개 페이지의 시각적 완성도와 주요 라우팅은 상당 부분 구현되어 있고, 보성 관리자에서 프로그램/후기/미디어/홈페이지 섹션을 다루는 초기 운영 도구도 존재한다.

다만 아직은 범용 템플릿 엔진이라기보다 보성 전용 구현에 가깝다. PRD 기준으로 판매 가능한 운영 SaaS가 되려면 신청자 CRM, 기수 관리, 입금 확인, 공지/메시지, 보고서 export를 더 촘촘하게 연결해야 한다.

| 영역 | 구현률 추정 | 판단 |
| --- | ---: | --- |
| Layer 1. 공개 모집 홈페이지 | 75% | 보성 기준 공개 페이지와 통합 탐색은 동작한다. |
| 전체차LAB 템플릿 | 70% | 기준 디자인은 구현됐지만 보성 전용 코드가 남아 있다. |
| Layer 2. 호스트 운영 SaaS | 40% | DB와 화면 골격은 있으나 실제 운영 업무 흐름은 더 필요하다. |
| Layer 3. 플랫폼 운영 | 45% | 외부 후보/관리자 구조는 있으나 품질 관리 UX는 초기다. |
| 판매 가능한 보성 운영팩 | 45% | 공개 화면은 좋고, 운영 도구는 아직 데모와 실사용 사이에 있다. |

## 2. 전체차LAB 템플릿 판단

현재 `/boseong`은 홈페이지 템플릿으로 봐도 된다.

구현된 템플릿 요소:

- 마을 전용 헤더/푸터
- 독립 브랜드 로고와 컬러 시스템
- 홈 히어로
- 전체차 오리지널 자동 전환 섹션
- 미디어 카드
- 후기 카드와 프로그램 필터
- 소개 페이지
- 프로그램 목록
- 미디어 목록/상세
- 후기 목록/상세
- 약관/개인정보 페이지

아직 템플릿화가 덜 된 부분:

- 컴포넌트 이름과 내부 로직이 `BoseongFigma*`에 묶여 있다.
- 레이아웃 값이 전체차LAB Figma 기준으로 고정된 곳이 많다.
- 다른 마을이 같은 템플릿을 쓰려면 색상, 로고, 섹션, 카드 타입을 설정값으로 분리해야 한다.
- `/host/villages`와 `/host/boseong`의 관리 경험이 아직 완전히 통합되지 않았다.

## 3. PRD 기능별 구현 현황

### 3.1 공개 모집 홈페이지

상태: 구현됨

구현된 것:

- `/` 통합 프로그램 탐색
- `/villages` 마을 목록
- `/[villageSlug]` 짧은 마을 URL
- `/villages/[slug]` canonical 마을 URL
- `/[villageSlug]/[programSlug]` 마을별 프로그램 상세
- `/boseong` 전체차LAB 홈
- `/boseong/about`
- `/boseong/programs`
- `/boseong/media`
- `/boseong/media/[mediaId]`
- `/boseong/reviews`
- `/boseong/reviews/[reviewId]`
- `/boseong/terms`
- `/boseong/privacy`
- `/boseong/privacy/third-party`

남은 것:

- 마을별 공지 페이지의 실운영 데이터 연결
- 프로그램 신청 CTA를 마을 내부 신청 경로와 더 자연스럽게 연결
- SEO/OG 메타데이터 보강
- 템플릿별 디자인 설정값 분리

### 3.2 마을 홈페이지 CMS

상태: 부분 구현

구현된 것:

- `village_page_sections` DB 구조
- `village_page_revisions` DB 구조
- `village_page_assets` 기반 이미지 업로드 API
- `/host/village-pages/sections` API
- `/host/village-pages/sections/publish` API
- `/host/boseong` 안의 `BoseongPageManager`
- 보성 home/about 일부 섹션 임시저장/발행

남은 것:

- 보성 전체 페이지 섹션의 완전한 CMS화
- 프로그램/미디어/후기 섹션 순서 관리
- 템플릿 선택 기능
- 섹션별 미리보기 품질 개선
- 일반 마을용 `VillagePageManager`로 추상화

### 3.3 프로그램 관리

상태: 부분 구현

구현된 것:

- `programs` DB 테이블
- `/host/programs` 프로그램 스튜디오
- `/api/host/programs` 저장 API
- published 프로그램 공개 노출
- 보성 관리자 내 프로그램 업로드 폼
- 외부 후보 승인 후 프로그램 초안 생성 기반

남은 것:

- 프로그램 상세 편집 UX 고도화
- 게시/비공개/마감 상태 관리 강화
- 프로그램별 기수 생성
- 프로그램별 신청서 연결 UI 강화
- 프로그램별 후기/만족도 자동 연결

### 3.4 신청서 빌더

상태: 부분 구현

구현된 것:

- `program_application_forms` DB 테이블
- `/host/forms` 신청서 빌더
- `/api/host/forms`
- 공개 신청 페이지에서 호스트 폼 템플릿 로드
- 신청 답변 DB 저장

남은 것:

- 개인정보 동의 문구와 신청서 필드 연결
- 보고서 필드 매핑
- 프로그램별 폼 버전 관리
- 필드 타입 확장
- 신청서 미리보기와 실제 신청 화면 간 1:1 검증

### 3.5 신청자 CRM

상태: 부분 구현

구현된 것:

- `program_applications` DB 테이블
- `application_status_events` DB 테이블
- `/api/program-applications` 신청 저장
- `/api/host/applications` 신청자 조회
- `/api/host/applications/[id]` 상태 변경
- `/host` 운영 콘솔에서 신청자 리스트와 상태 변경
- `/me`에서 이메일 기준 신청 이력 조회

남은 것:

- 신청자 상세 화면
- 기수별 필터
- 프로그램별/상태별 고급 필터
- 상태 변경 로그 UI
- 운영자 메모 저장
- 중복 참여자 탐지
- CSV/XLSX export

### 3.6 기수 관리

상태: 미구현

현재 상태:

- 후기/프로그램 데이터에는 `숙재받 4기` 같은 텍스트가 있다.
- DB와 운영 UI에는 독립적인 기수 엔티티가 없다.

필요한 것:

- `program_cohorts` 또는 유사 테이블
- 기수명, 프로그램, 모집 기간, 운영 기간, 정원, 상태
- 신청자를 기수에 배정
- 기수별 공지/메시지/후기/보고서 연결

### 3.7 입금/결제 확인

상태: 초기 기반

구현된 것:

- `program_applications.paymentAmount`
- `program_applications.paymentMethod`
- 호스트 운영 seed 데이터의 수납 금액
- 보고서 지표에서 수납 금액 집계

남은 것:

- 입금 상태 필드
- 입금자명, 입금액, 입금일, 확인자, 확인일
- 운영자 수동 체크 UI
- 입금 완료자 필터
- CSV 업로드 매칭
- PG/가상계좌 연동

권장 순서:

1. 수동 체크
2. CSV 업로드 매칭
3. PG/가상계좌 API

### 3.8 공지와 메시지

상태: 부분 구현

구현된 것:

- `message_templates`
- `message_campaigns`
- `scheduled_messages`
- `/host/messages`
- `/api/host/message-campaigns`
- 이메일/SMS/카카오 채널 타입
- 대상자 미리보기 기반

남은 것:

- 실제 이메일/SMS/카카오 발송 연동
- 기수별 공지 페이지
- 발송 이력 상세
- 실패 재시도
- 참가자가 마이페이지에서 공지를 다시 보는 UX

### 3.9 후기/만족도

상태: 부분 구현

구현된 것:

- `reviews` DB 테이블
- `/api/host/reviews`
- 보성 DOCX 후기 seed 반영
- 이름 가운데 글자 마스킹
- `/boseong/reviews` 후기 목록
- `전체`, `숙재받`, `로컬살롱`, `차실험` 필터
- 후기 상세에서 중복 제목/본문 표시 개선

남은 것:

- 참가자 직접 후기 작성 플로우
- 만족도 조사 폼
- 공개/비공개 검수 큐
- 후기와 신청자/기수/프로그램 연결 강화
- 후기 업로드 후 공개 반영 확인 UX

### 3.10 미디어/Instagram

상태: 부분 구현

구현된 것:

- `village_media_contents` DB 테이블
- `/api/host/media`
- 보성 미디어 목록/상세
- YouTube embed
- Instagram embed
- Facebook/Instagram OAuth 연결 API
- Instagram import API 기반

남은 것:

- 실제 그린티모시레 계정 권한 승인
- Instagram Graph API 권한/앱 검수
- import 결과 선택/검수 UI
- caption/thumbnail/게시일 자동 정리

### 3.11 보고서 export

상태: 부분 구현

구현된 것:

- `report_projects`
- `report_exports`
- `/host/reports`
- `/api/host/reports`
- 운영 데이터 기반 Markdown/JSON 다운로드
- 보고 준비율 지표

남은 것:

- CSV/XLSX export
- 제출용 보고서 템플릿
- 신청서 필드와 보고서 필드 매핑
- 만족도/후기 요약 자동 반영
- PDF export

### 3.12 인증/계정

상태: 부분 구현

구현된 것:

- Supabase Auth 기반 Google OAuth 코드
- Kakao OAuth 코드
- Naver custom OAuth 코드
- 이메일/비밀번호 로그인 UI
- 이메일/비밀번호 회원가입 UI
- `/auth/callback`
- `/api/auth/session`
- `/api/auth/logout`
- `profiles` 테이블
- `user`, `partner`, `admin` role
- `/me` 마이페이지

남은 것:

- Supabase OAuth provider 실제 콘솔 설정 검증
- 이메일 인증 정책 확정
- 비밀번호 재설정
- 관리자/운영자 권한 부여 UI
- 보호 라우트 접근 제어 강화

### 3.13 외부 공고 후보

상태: 부분 구현

구현된 것:

- RSS source 관리
- 외부 공고 DB 저장
- program lead 생성
- admin lead approval
- 승인 시 프로그램 초안 생성
- Vercel Cron 기반 수집

남은 것:

- 공개 홈에 자동 후보가 섞이지 않도록 정책 고정
- 제외 키워드/필수 앵커 강화
- 후보 검수 UI 고도화
- 후보 상태별 품질 관리

## 4. 오늘 기준 주요 차이점

### 구현됐다고 봐도 되는 것

- 전체차LAB 공개 홈페이지 템플릿 기준
- 보성 미디어/후기/프로그램 공개 라우팅
- 보성 후기 필터
- 마을 홈페이지 CMS의 초기 구조
- 프로그램/신청서/신청자 DB 골격
- 메시지/보고서 DB 골격
- 소셜 로그인 코드 경로
- 이메일 로그인/회원가입 UI

### 아직 제품이라고 부르기 어려운 것

- 보성 대표님이 혼자 전체 홈페이지를 완전히 재구성하는 수준의 CMS
- 실제 기수 운영
- 입금 확인 업무
- 공지방/후기방을 대체하는 공식 공지 공간
- 보고서 XLSX/PDF
- 실발송 메시지
- 운영자 권한 UX

## 5. 다음 구현 우선순위

### 1순위: 보성 운영팩 완성

1. 기수 테이블과 UI 추가
2. 신청자 상세 화면
3. 신청자에 기수 배정
4. 입금 수동 체크
5. 기수별 공지 페이지
6. 후기/만족도 제출 상태 관리

### 2순위: CMS 실사용화

1. `BoseongPageManager`를 범용 `VillagePageManager`로 분리
2. 색상/로고/폰트/섹션 설정값 추상화
3. 모든 홈 섹션의 텍스트/이미지/순서 수정
4. 프로그램/미디어/후기 노출 순서 관리

### 3순위: 보고서와 export

1. 신청자 CSV export
2. 보고서 XLSX export
3. 신청서 필드와 보고서 필드 매핑
4. 후기/만족도 요약 자동 집계

### 4순위: 인증과 권한

1. 테스트 계정 기반 역할 검증
2. host/admin 라우트 접근 제어 강화
3. 비밀번호 재설정
4. 운영자 초대 플로우

### 5순위: 자동화

1. 이메일 발송
2. SMS/카카오 알림톡
3. 입금 CSV 매칭
4. PG/가상계좌
5. Instagram 정식 import 검수 UI

## 6. 결론

현재 전체차LAB은 NUVIO가 팔고 싶은 제품의 공개 얼굴을 보여주기에는 충분히 가까워졌다. 다음 병목은 디자인보다 운영 SaaS다.

따라서 다음 개발은 “홈페이지를 더 예쁘게”보다 “보성 대표님이 실제로 신청자와 기수를 운영할 수 있게”에 집중해야 한다. 특히 기수 관리, 입금 확인, 신청자 상세, 공지, 보고서 export가 판매 가능성을 결정한다.
