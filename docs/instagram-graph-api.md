# Instagram Graph API 연동 메모

NUVIO 호스트 콘솔은 Meta/Facebook OAuth를 통해 마을 운영자의 Instagram Professional 계정을 연결한다.

## 그린티모시레에 요청할 준비

1. `greent_mosire` Instagram 계정을 Business 또는 Creator 계정으로 전환한다.
2. 해당 Instagram 계정을 Facebook 페이지에 연결한다.
3. Facebook 페이지 관리자 권한이 있는 담당자가 NUVIO 호스트 페이지에서 `Facebook으로 연결하기`를 누른다.
4. Meta 승인 화면에서 `pages_show_list`, `pages_read_engagement`, `instagram_basic` 권한을 승인한다.

비밀번호, 인증번호, 개인 액세스 토큰은 공유받지 않는다.

## NUVIO 환경변수

```bash
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=https://nuvio-web-blue.vercel.app/api/host/facebook/callback
META_GRAPH_API_VERSION=v24.0
SOCIAL_TOKEN_ENCRYPTION_KEY=
```

`SOCIAL_TOKEN_ENCRYPTION_KEY`가 있으면 연결 토큰은 AES-GCM으로 암호화되어 DB에 저장된다. 비어 있으면 개발 편의를 위해 `plain:` 접두사로 저장되므로 운영 배포 전에는 반드시 설정한다.

## 구현된 흐름

- `GET /api/host/facebook/connect`: Meta OAuth 승인 화면으로 이동
- `GET /api/host/facebook/callback`: code 교환, Page/Instagram 계정 확인, 연결 저장
- `GET /api/host/facebook/status`: 호스트 화면에서 연결 상태 조회
- `POST /api/host/instagram/import`: 연결된 Instagram 계정의 최신 미디어를 전체차LAB 미디어로 가져오기

가져온 미디어는 `village_media_contents.legacy_id = instagram-{media_id}` 기준으로 갱신되어 같은 게시물을 여러 번 가져와도 중복 생성되지 않는다.
