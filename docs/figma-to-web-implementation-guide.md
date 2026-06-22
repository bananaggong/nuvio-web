# NUVIO Figma To Web Implementation Guide

이 문서는 피그마에 이미 구현된 누비오 화면을 실제 웹으로 옮길 때의 공통 구현 규칙입니다. 단일 페이지를 비슷하게 맞추는 것이 아니라, 앞으로 모든 피그마 기반 화면을 같은 방법론으로 구현하고 리팩토링하기 위한 기준입니다.

## Core Principle

누비오의 피그마 데스크톱 프레임은 1440px 기준으로 설계되어 있습니다. 실제 웹에서는 1440px을 기준값으로 삼고, 데스크톱에서는 1920px까지 같은 비율로 확대합니다.

- 1440px 화면에서는 피그마 좌표와 크기가 1:1로 맞아야 합니다.
- 1920px 화면에서는 1440 기준 수치가 `4 / 3` 배율로 커져야 합니다.
- 1440과 1920 사이에서는 선형으로 커져야 합니다.
- 1920보다 넓은 화면에서는 1920 프레임을 기준으로 중앙 정렬하거나 의도된 배경만 확장합니다.
- 글자 크기, 아이콘 크기, 여백, 선 두께, 라운드, 좌표도 같은 기준을 따릅니다.

기본 변환식은 아래와 같습니다.

```css
--figma-scale: clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333);
--x-16: clamp(16px, 1.111vw, 21.333px);
```

수치가 `Bpx`일 때 표준 토큰은 아래 형태입니다.

```css
--token: clamp(Bpx, calc(B / 1440 * 100vw), calc(B * 1920 / 1440 * 1px));
```

Tailwind에서 폰트 크기 변수를 쓸 때는 반드시 `text-[length:var(--token)]`을 사용합니다. `text-[var(--token)]`은 Tailwind가 색상/임의값으로 해석할 수 있어서 피그마 구현에서는 사용하지 않습니다.

## Required Workflow

피그마 기반 페이지를 만들거나 수정할 때는 아래 순서를 따릅니다.

1. 피그마의 실제 프레임명, 기준 width, 주요 좌표, 폰트, 컬러, 아이콘 소스를 확인합니다.
2. 구현 대상이 `정밀 피그마 화면`, `기능 중심 화면`, `레거시 관리 화면` 중 어디에 속하는지 분류합니다.
3. 정밀 피그마 화면은 1440 좌표를 기준으로 토큰을 먼저 만들고, 컴포넌트에서 토큰을 사용합니다.
4. 아이콘은 `public/icons/nuvio`에 있는 SVG와 `src/components/icons/nuvio-icons.ts`를 통해 참조합니다.
5. 피그마에 있는 아이콘이 프로젝트에 없으면 임의 SVG나 lucide 아이콘을 만들지 말고 먼저 SVG 에셋으로 추가한 뒤 `nuvioIcons`에 등록합니다.
6. 구현 후 1440px과 1920px에서 스크린샷을 찍고 피그마와 좌표, 크기, 폰트, 색, 여백을 비교합니다.
7. 차이가 남는 부분은 코드 주석이 아니라 문서 또는 이슈로 남겨 다음 리팩토링 범위가 보이게 합니다.

## Repeat Prevention Checklist

피그마 차이를 한 번 수정한 뒤 같은 시행착오가 반복되지 않도록 아래 항목을 작업 종료 전에 확인합니다.

- 공통 헤더, 공통 사이드바, 공통 아이콘, 공통 스크롤 구조의 문제라면 개별 페이지가 아니라 공유 컴포넌트에서 고칩니다.
- 호스트/채널 워크스페이스 사이드바는 공유 컴포넌트입니다. 채널 관리자는 별도 사이드바를 만들지 않고 같은 탭 구조 안에서 메뉴만 전환합니다.
- 사용자가 요청하지 않은 설명 문구, 임시 제목, 보조 박스, 디버그성 버튼은 피그마에 없으면 화면에 남기지 않습니다.
- 피그마 프레임 이름은 개발 중 참고용일 뿐입니다. 실제 제품 화면 안에 그대로 렌더링하지 않습니다.
- 같은 화면에서 브라우저 기본 스크롤과 내부 가로/세로 스크롤이 겹치면 완료로 보지 않습니다.
- 아이콘은 Figma 아이콘을 SVG 에셋으로 먼저 추가하고 `nuvioIcons`에 등록합니다. lucide나 임의 SVG는 임시 구현으로 남기지 않습니다.
- 1440px에서 먼저 정확히 맞춘 뒤 1920px에서 `4 / 3` 배율로 커지는지 확인합니다. 1920px에 맞추려고 1440px 좌표를 희생하지 않습니다.
- 변경 후 `git diff --check`, 필요한 lint/build, 커밋, 푸시, `git status -sb` clean 확인까지 한 묶음으로 처리합니다.

## Layout Patterns

### Preferred: Token Scale Layout

정밀 피그마 화면의 기본 방식입니다. 루트에 스케일 토큰을 두고, 모든 숫자값을 `clamp(base, vw, max)` 형태로 정의합니다.

```tsx
const figmaScaleStyle = {
  "--screen-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--screen-16": "clamp(16px, 1.111vw, 21.333px)",
  "--screen-144": "clamp(144px, 10vw, 192px)",
} as CSSProperties;
```

컴포넌트에서는 아래처럼 사용합니다.

```tsx
<section
  className="w-[var(--screen-144)] text-[length:var(--screen-16)]"
  style={figmaScaleStyle}
/>
```

이 방식은 현재 `src/components/host-workspace-ui.tsx`와 `src/components/host-channel-menu-settings.tsx`가 가장 가깝습니다.

### Exception: Full Frame Scaling

피그마 프레임 전체를 하나의 캔버스처럼 정확히 보존해야 하는 화면에서는 `width: 1440px` 프레임을 만들고 전체를 `zoom` 또는 `transform`으로 키울 수 있습니다. 다만 이 방식은 sticky, scroll, hit area, 모바일 대응에서 문제가 생기기 쉬우므로 예외로만 사용합니다.

현재 `src/components/program-detail-scale.tsx`가 이 방식에 가깝습니다. 앞으로는 상호작용이 많은 화면에서는 토큰 스케일 방식으로 점진적으로 옮기는 것을 우선합니다.

### Legacy: Fixed 1440 Layout

`max-w-[1440px]`, `w-[1440px]`, `md:left-[...]`, `md:top-[...]`를 직접 박는 방식은 1440에서는 비슷하게 보일 수 있지만 1920에서 피그마 비율이 무너집니다. 새 작업에서는 금지하고, 기존 코드는 리팩토링 후보로 둡니다.

현재 `src/components/boseong-figma-site.tsx`가 이 유형에 많이 남아 있습니다. 편집기 미리보기처럼 의도적으로 1440 캔버스를 보여주는 경우만 예외입니다.

## Scroll And Overflow

정밀 피그마 화면에서 스크롤은 의도한 축과 컨테이너에만 하나씩 존재해야 합니다. 페이지 전체 세로 스크롤과 내부 프레임 가로 스크롤이 동시에 생기면 구현 오류로 봅니다.

- 데스크톱 전체 화면의 가로 스크롤은 기본적으로 금지합니다.
- 루트 워크스페이스에는 필요하면 `overflow-x-hidden`을 둡니다.
- 본문 영역에 `overflow-x-auto`를 넣기 전에 정말 내부 가로 스크롤이 피그마에 있는지 확인합니다.
- `width: scaledFrameWidth`와 `min-width: baseFrameWidth`를 함께 쓰는 패턴은 피합니다. 세로 스크롤바 폭 때문에 실제 viewport가 줄면 몇 px 차이로 내부 스크롤이 생깁니다.
- 본문 프레임은 `w-full max-w-[var(--frame-width)]`처럼 사용 가능한 폭 안에서 줄어들 수 있어야 합니다.
- 반복 row나 divider는 고정 `w-[...]`보다 부모 기준 `w-full`을 우선합니다.
- `scrollWidth > clientWidth`가 생기는지 1440px과 1920px에서 확인합니다.
- 예외는 데이터 테이블, 캔버스, 타임라인처럼 피그마에서 명확히 내부 가로 스크롤이 설계된 경우뿐입니다.

## Typography

피그마 기반 누비오 화면은 Pretendard 기준으로 맞춥니다. 현재 전역 Next font는 Geist로 설정되어 있으므로, 정밀 피그마 화면 루트에는 `font-pretendard`를 명시합니다.

- 피그마의 font size, weight, line-height를 그대로 토큰화합니다.
- font size도 1440에서 1920까지 비율로 커져야 합니다.
- letter spacing은 피그마에 명시된 경우만 적용합니다. 임의 negative letter spacing은 쓰지 않습니다.
- 버튼, 탭, 메뉴 텍스트는 줄바꿈 여부까지 피그마와 비교합니다.

## Colors

피그마 기반 화면에서는 Tailwind 기본 색상인 `slate`, `teal`, `orange-*`를 임의로 섞지 않습니다. 피그마에서 확인한 hex 값을 직접 사용하거나 페이지 토큰으로 등록합니다.

반복해서 쓰이는 누비오 컬러는 `src/app/globals.css`의 전역 토큰을 우선 사용합니다.

- Primary orange: `#FE701E`
- Accent orange: `#FF9A3D`
- Text ink: `#0D0D0C`
- Brown text: `#5B3A29`
- Muted text: `#6D7A8A`
- Soft line: `#F3E2D5`

## Icons

피그마 기반 화면의 아이콘은 직접 그리거나 임의 라이브러리에서 대체하지 않습니다.

1. 먼저 `public/icons/nuvio`에서 해당 SVG가 있는지 확인합니다.
2. 코드에서는 직접 문자열 경로를 쓰지 말고 `src/components/icons/nuvio-icons.ts`의 `nuvioIcons`를 통해 참조합니다.
3. 에셋이 없으면 피그마에서 SVG로 추출해 `public/icons/nuvio`에 추가하고 `nuvioIcons`에 등록합니다.
4. `lucide-react`는 피그마와 1:1 대응하지 않는 레거시 관리 화면, 임시 기능 화면, 또는 피그마에 없는 기능성 아이콘에만 사용합니다.
5. 피그마에 이미 아이콘 세트가 있는 화면에서는 lucide를 최종 구현으로 남기지 않습니다.

현재 아이콘 에셋 기준은 `public/icons/nuvio/README.md`와 `src/components/icons/nuvio-icons.ts`입니다.

## Images And Placeholders

피그마의 회색 박스가 실제 이미지가 아니라 콘텐츠 영역을 뜻하는 경우가 있습니다. 구현 전에 해당 박스가 `이미지 placeholder`, `본문 콘텐츠 컨테이너`, `비어 있음 상태`, `편집 가능한 캔버스` 중 무엇인지 확인합니다.

- 실제 콘텐츠가 들어가는 영역에는 더미 회색 박스를 남기지 않습니다.
- 이미지가 필요한 곳은 DB 이미지, public asset, 또는 명확한 fallback 이미지를 사용합니다.
- 비어 있음 상태는 피그마에 있는 empty state 그래픽과 문구를 그대로 사용합니다.

## Verification Standard

피그마 기반 화면은 구현 후 반드시 1440px과 1920px에서 확인합니다.

확인 항목:

- 프레임 좌우 여백과 주요 x/y 좌표
- header/sidebar/content 영역 높이
- 폰트 크기와 굵기
- 색상 hex
- 탭 underline, 버튼, 입력창, border 두께
- 아이콘 크기와 색
- 긴 텍스트 줄바꿈
- 스크롤 영역과 sticky 영역
- 불필요한 내부 가로 스크롤과 이중 스크롤 여부
- 클릭 가능한 hit area

시각 검증 결과는 `output/visual-diff`에 남기는 것을 권장합니다.

## Current Implementation Audit

현재 코드베이스는 피그마 구현 방식이 섞여 있습니다. 리팩토링 기준은 아래처럼 봅니다.

| Area | Current Pattern | Status |
| --- | --- | --- |
| `src/components/host-workspace-ui.tsx` | `--host-*` scale token, `nuvioIcons` 일부 사용 | 표준에 가장 가까움 |
| `src/components/host-channel-menu-settings.tsx` | 1440 좌표 기반 토큰/절대 배치 | 채널 매니저 정밀 구현 기준으로 유지 |
| `src/components/host-applications-crm.tsx` | `--app-*` scale token과 `vw` grid 혼합 | 부분 표준, 추가 정리 필요 |
| `src/components/program-detail-scale.tsx` | 전체 프레임 `zoom` 스케일 | 예외 방식, 상호작용 검증 필요 |
| `src/app/programs/[id]/page.tsx` | `min-[1440px]:vw`와 고정값 혼합 | 피그마 상세페이지 리팩토링 후보 |
| `src/components/mypage.tsx` | `max-w-[1440px]`, `min-[1440px]:vw` 혼합 | 작동 가능하지만 표준화 필요 |
| `src/components/boseong-figma-site.tsx` | `max-w-[1440px]`, 고정 좌표 다수 | 1920 비율 리팩토링 필요 |
| `src/app/host/settings/page.tsx` | host 토큰 사용, 일부 `text-[var(--token-name)]` 형태 잔존 | 폰트 변수 문법 정리 필요 |
| Admin/legacy pages | lucide, Tailwind 기본 spacing 중심 | 피그마 정밀 대상이 아니면 허용 |

## Refactor Priority

1. 새로 구현하는 피그마 화면은 이 문서를 기준으로 처음부터 작성합니다.
2. 사용자가 현재 보고 있는 핵심 화면부터 `text-[var(--token-name)]`, lucide 대체, 고정 1440 폭을 제거합니다.
3. 프로그램 상세, 신청폼, 호스트/채널 사이드바처럼 피그마와 직접 비교되는 화면을 우선 리팩토링합니다.
4. 마이페이지와 기존 호스트 페이지는 현재 흐름이 작동하므로, 새 기능 작업과 맞닿는 부분부터 점진 정리합니다.
5. 보성 공개페이지는 로컬페이지/채널 구조가 정리된 뒤 1440 고정 레이아웃을 1920 스케일 토큰으로 옮깁니다.

## Definition Of Done

피그마 기반 화면은 아래 조건을 만족해야 완료로 봅니다.

- `AGENTS.md`와 이 문서의 1440→1920 규칙을 따른다.
- 1440px과 1920px 스크린샷을 확인했다.
- 피그마 아이콘은 `public/icons/nuvio`와 `nuvioIcons`를 통해 사용한다.
- 폰트 크기 변수는 `text-[length:var(--token-name)]`로 쓴다.
- Pretendard가 필요한 화면에 `font-pretendard`가 적용되어 있다.
- 피그마의 색상, 선, 라운드, 여백을 임의 Tailwind 기본값으로 대체하지 않았다.
- 회색 placeholder가 실제 콘텐츠 영역인지 이미지 영역인지 확인했다.
- 의도적으로 다른 부분은 코드가 아니라 작업 메모나 문서에 남겼다.
