import "server-only";

import type { Village } from "@/lib/village-types";

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=82`;

const boseongTeaFieldImage =
  "https://upload.wikimedia.org/wikipedia/commons/b/b3/Boseong_Green_Tea_Field.jpg";

export const seedVillages: Village[] = [
  {
    id: "seed-boseong",
    slug: "boseong",
    name: "전체차LAB",
    region: "전남",
    city: "보성군",
    tagline: "차를 매개로 청년의 삶과 지역의 미래를 연결합니다.",
    summary:
      "보성 회천면을 기반으로 공간, 체류, 차문화, 콘텐츠를 운영하는 청년마을입니다.",
    description:
      "2025년 청년마을 만들기 실적보고서의 사업개요, 공간, 프로그램, 성과, 후기 데이터를 기준으로 정리했습니다.",
    heroImage: boseongTeaFieldImage,
    logoText: "茶",
    brandColor: "#4E7C3A",
    accentColor: "#6BAA50",
    instagramUrl: "https://www.instagram.com/",
    kakaoUrl: "https://pf.kakao.com/",
    contactEmail: "hello@nuvio.kr",
    contactPhone: "061-000-2026",
    address: "전라남도 보성군",
    programIds: [1013, 1014, 1015],
    links: [
      {
        id: "english-name",
        label: "Jeonchecha LAB",
        type: "website",
        url: "https://nuvio.kr/boseong",
      },
      {
        id: "photo-credit",
        label: "레거시 미디어",
        type: "website",
        url: "https://greentmosire.imweb.me/mediacontents",
      },
      {
        id: "instagram",
        label: "인스타그램",
        type: "instagram",
        url: "https://www.instagram.com/",
      },
      {
        id: "kakao",
        label: "카카오 채널",
        type: "kakao",
        url: "https://pf.kakao.com/",
      },
    ],
    sections: [
      {
        id: "story",
        type: "story",
        title: "사업 개요",
        body: "수행주체는 그린티모시레이며, 2025년 5월부터 11월까지 전라남도 보성군 회천면에서 운영했습니다.",
        items: ["사업예산 200백만원", "미션: 녹차와 젊음이 창조하는 뉴빌리티", "비전: 차를 매개로 청년의 삶과 지역의 미래를 연결"],
      },
      {
        id: "programs",
        type: "programs",
        title: "프로그램",
        body: "숙박비는 재능으로 받겠습니다, 로컬살롱, 나를 담는 차 실험실, 모여보성, 말해보성을 운영했습니다.",
        items: ["숙재받 8기 60명", "로컬살롱 4기 22명", "나를 담는 차 실험실 6명"],
      },
      {
        id: "spaces",
        type: "stay",
        title: "공간",
        body: "청년창직공간, 머문공간, 공간초록, 운영진 숙소, 57ha 녹차밭을 사업 공간으로 활용했습니다.",
        items: ["청년창직공간", "머문공간", "공간초록", "57ha 녹차밭"],
      },
      {
        id: "outcome",
        type: "community",
        title: "성과",
        body: "누비어 만족도, 재방문 의사, 주민 네트워킹, 콘텐츠 아카이브를 주요 성과로 기록했습니다.",
        items: ["로컬살롱 만족도 3.9/5.0", "나를 담는 차 실험실 5.0/5.0", "모여보성 32명", "말해보성 42명"],
      },
      {
        id: "archive",
        type: "notice",
        title: "홍보 아카이브",
        body: "인스타그램, 쓰레드, 유튜브, 블로그, 신문·방송 보도를 통해 보성과 차문화를 기록했습니다.",
        items: ["인스타그램 124건", "쓰레드 35건", "유튜브 94건", "보도 23건"],
      },
      {
        id: "report",
        type: "faq",
        title: "보고 데이터",
        body: "신청, 선정, 참여, 만족도, 후기, 홍보 성과, 예산 집행 항목을 같은 구조로 축적해야 합니다.",
        items: ["누비어 명단", "설문 응답", "후기 원문", "증빙 사진", "예산 집행"],
      },
    ],
    published: true,
    updatedAt: "2026-05-06T00:00:00.000Z",
  },
  {
    id: "seed-gangneung-wave",
    slug: "gangneung-wave",
    name: "강릉 파도 워케이션",
    region: "강원",
    city: "강릉시",
    tagline: "바다 가까운 업무공간과 로컬 네트워크가 있는 워케이션 마을",
    summary:
      "강릉 워케이션 프로그램을 중심으로 누비어 모집, 안내, 후기까지 이어지는 채널입니다.",
    description:
      "공유오피스, 로컬 카페, 바다 생활권을 묶어 원격근무자와 창작자가 머무를 수 있는 마을형 워케이션 브랜드입니다.",
    heroImage: image("photo-1507525428034-b723cf961d3e"),
    logoText: "GW",
    brandColor: "#0369a1",
    accentColor: "#ea580c",
    contactEmail: "gangneung@nuvio.kr",
    contactPhone: "033-000-1201",
    address: "강원도 강릉시",
    programIds: [1001, "gangneung-wave-workation"],
    links: [],
    sections: [
      {
        id: "story",
        type: "story",
        title: "마을 소개",
        body: "업무 집중과 지역 체험을 같은 일정 안에서 설계하는 워케이션형 마을입니다.",
        items: ["공유오피스 이용", "로컬 카페 네트워킹", "해변 생활권 안내"],
      },
      {
        id: "stay",
        type: "stay",
        title: "체류 안내",
        body: "숙소 위치, 업무공간, 프로그램 동선은 선정자에게 공식 안내 페이지로 다시 제공합니다.",
        items: ["숙소 위치 안내", "업무 좌석 예약", "누비어 OT"],
      },
    ],
    published: true,
    updatedAt: "2026-05-06T00:00:00.000Z",
  },
  {
    id: "seed-namhae-island",
    slug: "namhae-island",
    name: "남해 섬마을 한달살이",
    region: "경남",
    city: "남해군",
    tagline: "느린 체류와 로컬 기록을 연결하는 섬마을 홈",
    summary:
      "한달살이 모집과 체류 안내, 활동 기록을 묶어 누비어가 이후에도 로컬 소식을 이어 받을 수 있게 합니다.",
    description:
      "섬마을 숙소와 생활권, 후기 수집, 기수별 소통을 호스트가 한 화면에서 관리할 수 있도록 설계된 채널입니다.",
    heroImage: image("photo-1519046904884-53103b34b206"),
    logoText: "NH",
    brandColor: "#0f766e",
    accentColor: "#2563eb",
    contactEmail: "namhae@nuvio.kr",
    contactPhone: "055-000-4812",
    address: "경상남도 남해군",
    programIds: [1002, "namhae-island-month"],
    links: [],
    sections: [
      {
        id: "story",
        type: "story",
        title: "마을 소개",
        body: "남해 섬마을 한달살이는 긴 체류를 통해 지역의 일상과 관계를 천천히 알아가는 프로그램입니다.",
        items: ["장기 체류", "로컬 기록", "기수별 커뮤니티"],
      },
      {
        id: "community",
        type: "community",
        title: "후기와 소식",
        body: "누비어가 남긴 후기와 사진을 다음 기수 모집과 보고서 자료로 다시 활용합니다.",
        items: ["만족도 조사", "활동 후기", "마을 소식 구독"],
      },
    ],
    published: true,
    updatedAt: "2026-05-06T00:00:00.000Z",
  },
];
