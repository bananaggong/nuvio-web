# NUVIO Terminology

이 문서는 코드와 화면에서 우선 적용하는 누비오 용어 기준입니다.
더 넓은 제품/화면 기준은 [NUVIO Product Guide](./nuvio-product-guide.md)를 함께 확인합니다.

## Canonical Terms

| Use | Avoid |
| --- | --- |
| 누비어 | 참가자, 참여자 |
| 호스트 | 운영자, 운영기관 담당자 |
| 로컬페이지 | 로컬홈, 마을 페이지, 마을 홈페이지 |
| 로컬채널 | 로컬 채널, 마을 채널 |
| 소식지 | 매거진 |
| 저장 | 북마크 |
| 내 여행 프로그램 | 신청 내역 |
| 마이페이지 | 내 프로필, 프로필 페이지 |
| 폴더 | 프로젝트 |
| 신청번호 | 예약번호 |

## Compatibility Terms

아래 표현은 사용자에게 직접 노출하지 않는 내부 호환성 이름으로만 남길 수 있습니다.

| Internal Term | Reason |
| --- | --- |
| `bookmark`, `bookmarks` | 기존 라우트와 프로그램 상태 API 호환성 |
| `saved_programs` | DB 테이블명 |
| `village`, `village_page_sections` | 기존 로컬페이지 모델과 CMS 테이블명 |
| `projectId`, `report_projects` | 호스트 폴더 기능의 기존 라우트/DB 호환성 |
| 참가자/참여자 | 외부 공고 크롤링 키워드 또는 원문 후기 인용문 |
