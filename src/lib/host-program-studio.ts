import type {
  PeriodKey,
  ProgramStatus,
  ThemeKey,
} from "@/lib/types";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export type HostProgramItineraryDay = {
  id: string;
  title: string;
  summary: string;
  timetable: string;
  image: string;
};

export type HostProgramPlaceInfo = {
  meetingAddress: string;
  meetingAddressDetail: string;
  meetingMemo: string;
  parkingGuide: string;
  transportGuide: string;
  accommodationEnabled: boolean;
  accommodationName: string;
  accommodationMemo: string;
};

export type HostProgramDraft = {
  id: string;
  slug?: string;
  villageId?: string;
  title: string;
  region: string;
  city: string;
  summary: string;
  description: string;
  theme: ThemeKey;
  periodKey: PeriodKey;
  recruitStart: string;
  recruitEnd: string;
  activityStart: string;
  activityEnd: string;
  target: string;
  capacity: string;
  subsidyLabel: string;
  subsidyAmount: number;
  fee: string;
  status: ProgramStatus;
  sourceName: string;
  sourceUrl: string;
  applyUrl: string;
  phone: string;
  hashtags: string[];
  image: string;
  itineraryDays: HostProgramItineraryDay[];
  placeInfo: HostProgramPlaceInfo;
  published: boolean;
  updatedAt: string;
};

export type ProgramDraftChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  helper: string;
};

export const HOST_PROGRAM_META_PREFIX = "__nuvio_host_program_meta__:";

const emptyPlaceInfo: HostProgramPlaceInfo = {
  accommodationEnabled: false,
  accommodationMemo: "",
  accommodationName: "",
  meetingAddress: "",
  meetingAddressDetail: "",
  meetingMemo: "",
  parkingGuide: "",
  transportGuide: "",
};

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
    hashtags: ["워케이션", "강원", "공유오피스"],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    itineraryDays: [
      {
        id: "day-1",
        image: "",
        summary: "강릉 도착 후 오리엔테이션과 해변 산책을 진행합니다.",
        timetable: "14:00 체크인\n16:00 오리엔테이션\n18:00 로컬 저녁",
        title: "1일차",
      },
    ],
    placeInfo: {
      ...emptyPlaceInfo,
      meetingAddress: "강원특별자치도 강릉시 창해로 14",
      transportGuide: "강릉역에서 택시 또는 시내버스로 이동할 수 있습니다.",
    },
    published: false,
    updatedAt: "2026-05-04T00:00:00+09:00",
  },
];

export function readHostProgramDrafts(): HostProgramDraft[] {
  return isDemoModeEnabled() ? seedHostProgramDrafts : [];
}

export function mergeHostProgramDrafts(
  primaryDrafts: HostProgramDraft[],
  secondaryDrafts: HostProgramDraft[],
): HostProgramDraft[] {
  const seen = new Set<string>();
  const mergedDrafts: HostProgramDraft[] = [];

  for (const draft of [...primaryDrafts, ...secondaryDrafts]) {
    const key = draft.id || draft.slug || draft.title;
    if (seen.has(key)) continue;

    seen.add(key);
    mergedDrafts.push(draft);
  }

  return mergedDrafts;
}

export function createHostProgramDraft(): HostProgramDraft {
  return {
    id: `draft-${Date.now()}`,
    villageId: "",
    title: "새 로컬 체류 프로그램",
    region: "강원",
    city: "도시명",
    summary: "누비어에게 제공할 핵심 혜택과 체류 경험을 한 문장으로 정리합니다.",
    description: "프로그램 목적, 운영 방식, 제공 혜택, 참여 조건을 입력합니다.",
    theme: "workation",
    periodKey: "week",
    recruitStart: new Date().toISOString().slice(0, 10),
    recruitEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    activityStart: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    activityEnd: new Date(Date.now() + 36 * 86400000).toISOString().slice(0, 10),
    target: "참여 대상",
    capacity: "모집 인원",
    subsidyLabel: "지원 혜택",
    subsidyAmount: 0,
    fee: "무료",
    status: "upcoming",
    sourceName: "운영 기관명",
    sourceUrl: "https://example.com",
    applyUrl: "https://nuvio.kr/apply",
    phone: "000-0000-0000",
    hashtags: ["지역체류", "지원사업"],
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    itineraryDays: [createHostProgramItineraryDay(1)],
    placeInfo: createHostProgramPlaceInfo(),
    published: false,
    updatedAt: new Date().toISOString(),
  };
}

export function buildProgramDraftChecklist(
  draft: HostProgramDraft,
): ProgramDraftChecklistItem[] {
  return [
    {
      id: "title",
      label: "기본 정보",
      done: draft.title.trim().length > 0 && draft.summary.trim().length > 0,
      helper: "제목과 요약이 입력되어야 합니다.",
    },
    {
      id: "schedule",
      label: "모집/운영 일정",
      done:
        Boolean(draft.recruitStart) &&
        Boolean(draft.recruitEnd) &&
        Boolean(draft.activityStart) &&
        Boolean(draft.activityEnd),
      helper: "모집 기간과 활동 기간을 모두 입력합니다.",
    },
    {
      id: "benefit",
      label: "지원 혜택",
      done: draft.subsidyLabel.trim().length > 0 || draft.subsidyAmount > 0,
      helper: "금액 또는 혜택 문구가 필요합니다.",
    },
    {
      id: "contact",
      label: "신청/문의 경로",
      done: draft.applyUrl.trim().length > 0 && draft.phone.trim().length > 0,
      helper: "신청 링크와 문의 연락처를 확인합니다.",
    },
    {
      id: "content",
      label: "상세 설명",
      done: draft.description.trim().length >= 20,
      helper: "누비어가 판단할 수 있는 설명을 충분히 입력합니다.",
    },
  ];
}

export function buildHostProgramJson(draft: HostProgramDraft): string {
  return JSON.stringify(
    {
      ...draft,
      dbTarget: "programs",
      readyForPublish: buildProgramDraftChecklist(draft).every((item) => item.done),
    },
    null,
    2,
  );
}

export function createHostProgramItineraryDay(
  dayNumber: number,
): HostProgramItineraryDay {
  return {
    id: `day-${dayNumber}-${Date.now()}`,
    image: "",
    summary: "",
    timetable: "",
    title: `${dayNumber}일차`,
  };
}

export function createHostProgramPlaceInfo(): HostProgramPlaceInfo {
  return { ...emptyPlaceInfo };
}

export function normalizeHostProgramItineraryDays(
  value: unknown,
): HostProgramItineraryDay[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      return {
        id: asText(record.id) || `day-${index + 1}`,
        image: asText(record.image),
        summary: asText(record.summary),
        timetable: asText(record.timetable),
        title: asText(record.title) || `${index + 1}일차`,
      };
    })
    .filter((item): item is HostProgramItineraryDay => Boolean(item));
}

export function normalizeHostProgramPlaceInfo(
  value: unknown,
): HostProgramPlaceInfo {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createHostProgramPlaceInfo();
  }

  const record = value as Record<string, unknown>;
  return {
    accommodationEnabled: Boolean(record.accommodationEnabled),
    accommodationMemo: asText(record.accommodationMemo),
    accommodationName: asText(record.accommodationName),
    meetingAddress: asText(record.meetingAddress),
    meetingAddressDetail: asText(record.meetingAddressDetail),
    meetingMemo: asText(record.meetingMemo),
    parkingGuide: asText(record.parkingGuide),
    transportGuide: asText(record.transportGuide),
  };
}

export function encodeHostProgramMeta(draft: HostProgramDraft): string {
  return `${HOST_PROGRAM_META_PREFIX}${JSON.stringify({
    itineraryDays: draft.itineraryDays,
    placeInfo: draft.placeInfo,
  })}`;
}

export function decodeHostProgramMeta(value: unknown): {
  itineraryDays: HostProgramItineraryDay[];
  placeInfo: HostProgramPlaceInfo;
} {
  const lines = Array.isArray(value) ? value : [];
  const encoded = lines
    .map((item) => (typeof item === "string" ? item : ""))
    .find((item) => item.startsWith(HOST_PROGRAM_META_PREFIX));

  if (!encoded) {
    return {
      itineraryDays: [],
      placeInfo: createHostProgramPlaceInfo(),
    };
  }

  try {
    const parsed = JSON.parse(encoded.slice(HOST_PROGRAM_META_PREFIX.length)) as {
      itineraryDays?: unknown;
      placeInfo?: unknown;
    };
    return {
      itineraryDays: normalizeHostProgramItineraryDays(parsed.itineraryDays),
      placeInfo: normalizeHostProgramPlaceInfo(parsed.placeInfo),
    };
  } catch {
    return {
      itineraryDays: [],
      placeInfo: createHostProgramPlaceInfo(),
    };
  }
}

export function stripHostProgramMeta(body: string[]): string[] {
  return body.filter((item) => !item.startsWith(HOST_PROGRAM_META_PREFIX));
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
