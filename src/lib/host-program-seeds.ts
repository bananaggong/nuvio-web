import "server-only";

import { isDemoModeEnabled } from "@/lib/demo-mode";
import {
  createHostProgramGuideInfo,
  createHostProgramPlaceInfo,
  type HostProgramDraft,
} from "@/lib/host-program-studio";

export const seedHostProgramDrafts: HostProgramDraft[] = [
  {
    id: "draft-gangneung-wave",
    title: "강릉 파도 워케이션 6월",
    region: "강원",
    city: "강릉시",
    summary: "원격근무자에게 숙박, 업무공간, 로컬 체험을 묶어 제공하는 워케이션 프로그램입니다.",
    description:
      "강릉 해변 근처 공유 오피스와 지역 체험을 연결해 일과 여행을 함께 설계합니다.",
    theme: "workation",
    periodKey: "week",
    recruitStart: "2026-05-01",
    recruitEnd: "2026-05-28",
    activityStart: "2026-06-10",
    activityEnd: "2026-06-15",
    target: "원격근무 가능 직장인 및 프리랜서",
    capacity: "24명",
    subsidyLabel: "숙박 3박 및 업무공간 무료",
    subsidyAmount: 420000,
    fee: "50,000원",
    status: "open",
    sourceName: "강릉 로컬워크 운영팀",
    sourceUrl: "https://example.com/notices/gangneung-workation",
    applyUrl: "https://nuvio.kr/programs/draft-gangneung-wave/apply",
    phone: "033-000-1201",
    contactEmail: "hello@nuvio.kr",
    hashtags: ["워케이션", "강원", "공유오피스"],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    detailImages: [],
    itineraryDays: [
      {
        id: "day-1",
        image: "",
        images: [],
        summary: "강릉 도착 후 오리엔테이션과 해변 산책을 진행합니다.",
        timetable: "14:00 체크인\n16:00 오리엔테이션\n18:00 로컬 저녁",
        title: "1일차",
      },
    ],
    placeInfo: {
      ...createHostProgramPlaceInfo(),
      meetingAddress: "강원특별자치도 강릉시 창해로 14",
      transportGuide: "강릉역에서 택시 또는 시내버스로 이동할 수 있습니다.",
    },
    guideInfo: createHostProgramGuideInfo(),
    published: false,
    updatedAt: "2026-05-04T00:00:00+09:00",
  },
];

export function readHostProgramDrafts(): HostProgramDraft[] {
  return isDemoModeEnabled() ? seedHostProgramDrafts : [];
}
