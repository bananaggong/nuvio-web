import type {
  PeriodKey,
  ProgramStatus,
  ThemeKey,
} from "@/lib/types";

export type HostProgramItineraryDay = {
  id: string;
  title: string;
  summary: string;
  timetable: string;
  image: string;
  images: string[];
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

export type HostProgramRefundRule = {
  id: string;
  daysBefore: string;
  refundRate: string;
};

export type HostProgramGuideInfo = {
  includedItems: string[];
  excludedItems: string[];
  preparationItems: string[];
  refundRules: HostProgramRefundRule[];
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
  contactEmail?: string;
  hashtags: string[];
  image: string;
  detailImages: string[];
  itineraryDays: HostProgramItineraryDay[];
  placeInfo: HostProgramPlaceInfo;
  guideInfo: HostProgramGuideInfo;
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

const emptyGuideInfo: HostProgramGuideInfo = {
  excludedItems: ["개인 교통비", "점심 식사 비용"],
  includedItems: ["숙박 2박", "프로그램 체험비 전체"],
  preparationItems: ["편한 복장, 개인 운동화", "음주 후 참가는 삼가주세요"],
  refundRules: [
    { daysBefore: "7", id: "refund-7", refundRate: "100" },
    { daysBefore: "3", id: "refund-3", refundRate: "50" },
  ],
};

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
    title: "",
    region: "",
    city: "",
    summary: "",
    description: "",
    theme: "workation",
    periodKey: "week",
    recruitStart: "",
    recruitEnd: "",
    activityStart: "",
    activityEnd: "",
    target: "",
    capacity: "",
    subsidyLabel: "",
    subsidyAmount: 0,
    fee: "",
    status: "upcoming",
    sourceName: "",
    sourceUrl: "",
    applyUrl: "",
    phone: "",
    contactEmail: "",
    hashtags: [],
    image: "",
    detailImages: [],
    itineraryDays: [createHostProgramItineraryDay(1)],
    placeInfo: createHostProgramPlaceInfo(),
    guideInfo: createHostProgramGuideInfo(),
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
      done:
        draft.applyUrl.trim().length > 0 &&
        (draft.phone.trim().length > 0 ||
          (draft.contactEmail ?? "").trim().length > 0),
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
    images: [],
    summary: "",
    timetable: "",
    title: `${dayNumber}일차`,
  };
}

export function createHostProgramPlaceInfo(): HostProgramPlaceInfo {
  return { ...emptyPlaceInfo };
}

export function createHostProgramGuideInfo(): HostProgramGuideInfo {
  return {
    excludedItems: [...emptyGuideInfo.excludedItems],
    includedItems: [...emptyGuideInfo.includedItems],
    preparationItems: [...emptyGuideInfo.preparationItems],
    refundRules: emptyGuideInfo.refundRules.map((rule) => ({ ...rule })),
  };
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
      const legacyImage = asText(record.image);
      const images = uniqueTexts(asTextArray(record.images));
      const normalizedImages = images.length > 0 ? images : legacyImage ? [legacyImage] : [];
      return {
        id: asText(record.id) || `day-${index + 1}`,
        image: legacyImage || normalizedImages[0] || "",
        images: normalizedImages,
        summary: asText(record.summary),
        timetable: asText(record.timetable),
        title: asText(record.title) || `${index + 1}일차`,
      };
    })
    .filter((item): item is HostProgramItineraryDay => Boolean(item));
}

export function normalizeHostProgramDetailImages(value: unknown): string[] {
  return uniqueTexts(asTextArray(value)).slice(0, 20);
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

export function normalizeHostProgramGuideInfo(
  value: unknown,
): HostProgramGuideInfo {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createHostProgramGuideInfo();
  }

  const record = value as Record<string, unknown>;
  return {
    excludedItems: normalizeGuideItems(record.excludedItems, emptyGuideInfo.excludedItems),
    includedItems: normalizeGuideItems(record.includedItems, emptyGuideInfo.includedItems),
    preparationItems: normalizeGuideItems(
      record.preparationItems,
      emptyGuideInfo.preparationItems,
    ),
    refundRules: normalizeRefundRules(record.refundRules),
  };
}

export function encodeHostProgramMeta(draft: HostProgramDraft): string {
  return `${HOST_PROGRAM_META_PREFIX}${JSON.stringify({
    detailImages: draft.detailImages,
    guideInfo: draft.guideInfo,
    itineraryDays: draft.itineraryDays,
    placeInfo: draft.placeInfo,
  })}`;
}

export function decodeHostProgramMeta(value: unknown): {
  detailImages: string[];
  guideInfo: HostProgramGuideInfo;
  itineraryDays: HostProgramItineraryDay[];
  placeInfo: HostProgramPlaceInfo;
} {
  const lines = Array.isArray(value) ? value : [];
  const encoded = lines
    .map((item) => (typeof item === "string" ? item : ""))
    .find((item) => item.startsWith(HOST_PROGRAM_META_PREFIX));

  if (!encoded) {
    return {
      detailImages: [],
      guideInfo: createHostProgramGuideInfo(),
      itineraryDays: [],
      placeInfo: createHostProgramPlaceInfo(),
    };
  }

  try {
    const parsed = JSON.parse(encoded.slice(HOST_PROGRAM_META_PREFIX.length)) as {
      detailImages?: unknown;
      guideInfo?: unknown;
      itineraryDays?: unknown;
      placeInfo?: unknown;
    };
    return {
      detailImages: normalizeHostProgramDetailImages(parsed.detailImages),
      guideInfo: normalizeHostProgramGuideInfo(parsed.guideInfo),
      itineraryDays: normalizeHostProgramItineraryDays(parsed.itineraryDays),
      placeInfo: normalizeHostProgramPlaceInfo(parsed.placeInfo),
    };
  } catch {
    return {
      detailImages: [],
      guideInfo: createHostProgramGuideInfo(),
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

function normalizeGuideItems(value: unknown, fallback: string[]): string[] {
  const items = uniqueTexts(asTextArray(value)).slice(0, 12);
  return items.length > 0 ? items : [...fallback];
}

function normalizeRefundRules(value: unknown): HostProgramRefundRule[] {
  if (!Array.isArray(value)) return emptyGuideInfo.refundRules.map((rule) => ({ ...rule }));

  const rules = value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      return {
        daysBefore: asText(record.daysBefore),
        id: asText(record.id) || `refund-${index + 1}`,
        refundRate: asText(record.refundRate),
      };
    })
    .filter((rule): rule is HostProgramRefundRule =>
      Boolean(rule && (rule.daysBefore || rule.refundRate)),
    )
    .slice(0, 8);

  return rules.length > 0 ? rules : emptyGuideInfo.refundRules.map((rule) => ({ ...rule }));
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => asText(item)).filter(Boolean);
}

function uniqueTexts(values: string[]): string[] {
  return Array.from(new Set(values));
}
