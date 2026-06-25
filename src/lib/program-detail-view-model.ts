import type { Program, ProgramRefundRule } from "@/lib/types";

export type ProgramScheduleViewItem = {
  body: string;
  day: string;
  image?: string;
  timetable?: string[];
};

export type ProgramPlaceDetails = {
  accommodation: string;
  meetingAddress: string;
  meetingMapAddress: string;
  meetingMemo: string;
  parkingGuide: string;
  transportGuide: string;
};

export type ProgramGuideDetails = {
  applicationGuide: string;
  excludedItems: string[];
  includedItems: string[];
  preparationItems: string[];
  refundRules: string[];
};

const scheduleFallbackItems = [
  {
    day: "1일차",
    body: "프로그램 세부 일정은 호스트가 확정한 순서에 맞춰 안내됩니다.",
  },
  {
    day: "2일차",
    body: "시간표, 준비 사항, 이동 안내는 신청 확정 후 순차적으로 제공됩니다.",
  },
];

export const fallbackScheduleItems = [
  "집결 및 안내",
  "프로그램 진행",
  "휴식 및 이동",
  "현장 안내",
  "자유 시간",
  "일정 마무리",
];

export function getProgramGalleryImages(program: Program): string[] {
  const itineraryImages =
    program.itineraryDays?.flatMap((day) => [day.image, ...day.images]) ?? [];
  const images = [program.image, ...program.gallery, ...itineraryImages]
    .map((image) => image.trim())
    .filter(isDisplayableProgramImage);

  return Array.from(new Set(images));
}

export function getProgramIntroParagraphs(
  program: Program,
  limit = 2,
): string[] {
  const paragraphs = [program.summary, ...program.body, program.description]
    .flatMap(splitPlainParagraphs)
    .filter(Boolean);
  const seen = new Set<string>();
  const uniqueParagraphs = paragraphs.filter((paragraph) => {
    const key = paragraph.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueParagraphs.slice(0, limit);
}

export function getProgramScheduleItems(
  program: Program,
  galleryImages: string[],
): ProgramScheduleViewItem[] {
  const itineraryDays =
    program.itineraryDays?.filter((day) =>
      [day.title, day.summary, day.timetable, day.image, ...day.images].some((value) =>
        value.trim(),
      ),
    ) ?? [];

  if (itineraryDays.length > 0) {
    return itineraryDays.map((day, index) => {
      const timetable = splitTimetable(day.timetable);
      const dayImages = [day.image, ...day.images]
        .map((image) => image.trim())
        .filter(isDisplayableProgramImage);
      return {
        body:
          day.summary ||
          timetable[0] ||
          `${program.title} ${index + 1}일차 일정입니다.`,
        day: day.title || `${index + 1}일차`,
        image: dayImages[0] || galleryImages[index + 1] || galleryImages[0],
        timetable,
      };
    });
  }

  return scheduleFallbackItems.map((item, index) => ({
    ...item,
    image: galleryImages[index + 1] || galleryImages[0],
  }));
}

export function getProgramPlaceDetails(program: Program): ProgramPlaceDetails {
  const placeInfo = program.placeInfo;
  const meetingMapAddress =
    placeInfo?.meetingAddress?.trim() || joinText([program.region, program.city]);
  const meetingAddress =
    joinText([placeInfo?.meetingAddress, placeInfo?.meetingAddressDetail]) ||
    meetingMapAddress ||
    "집결지 정보는 준비 중입니다.";

  const accommodation = placeInfo?.accommodationEnabled
    ? joinText([placeInfo.accommodationName, placeInfo.accommodationMemo]) ||
      "숙소 정보는 신청 확정 후 안내됩니다."
    : "";

  return {
    accommodation,
    meetingAddress,
    meetingMapAddress,
    meetingMemo: placeInfo?.meetingMemo?.trim() ?? "",
    parkingGuide:
      placeInfo?.parkingGuide?.trim() ||
      "주차 가능 여부와 이용 방법은 신청 확정 후 안내됩니다.",
    transportGuide:
      placeInfo?.transportGuide?.trim() ||
      "대중교통, 셔틀, 도보 이동 등 상세 이동 안내는 신청 확정 후 안내됩니다.",
  };
}

export function getProgramGuideDetails(program: Program): ProgramGuideDetails {
  const guideInfo = program.guideInfo;

  return {
    applicationGuide:
      program.announcement?.trim() ||
      `${formatKoreanDate(program.recruitEnd)}까지 신청할 수 있습니다.`,
    excludedItems: normalizeGuideItems(
      guideInfo?.excludedItems,
      "불포함 항목은 신청 확정 후 안내됩니다.",
    ),
    includedItems: normalizeGuideItems(
      guideInfo?.includedItems,
      "포함 항목은 신청 확정 후 안내됩니다.",
    ),
    preparationItems: normalizeGuideItems(
      guideInfo?.preparationItems,
      "준비물은 신청 확정 후 안내됩니다.",
    ),
    refundRules: normalizeRefundRules(guideInfo?.refundRules),
  };
}

export function formatCompactDateRange(start: string, end: string): string {
  const startDate = parseDateParts(start);
  const endDate = parseDateParts(end);
  if (!startDate || !endDate) return joinText([start, end]);

  if (startDate.year === endDate.year) {
    return `${startDate.year}.${startDate.month}.${startDate.day}-${endDate.month}.${endDate.day}`;
  }

  return `${startDate.year}.${startDate.month}.${startDate.day}-${endDate.year}.${endDate.month}.${endDate.day}`;
}

export function formatKoreanDate(value: string): string {
  const date = parseDateParts(value);
  if (!date) return value;
  return `${date.year}년 ${date.month}월 ${date.day}일`;
}

export function isDisplayableProgramImage(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)
  );
}

export function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function splitPlainParagraphs(value: string): string[] {
  return stripHtml(value)
    .split(/\r?\n+/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/[ \t]+/gu, " ")
    .trim();
}

function splitTimetable(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinText(values: Array<string | undefined>): string {
  return values.map((value) => value?.trim()).filter(Boolean).join(" ");
}

function normalizeGuideItems(value: string[] | undefined, fallback: string): string[] {
  const items = (value ?? []).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : [fallback];
}

function normalizeRefundRules(value: ProgramRefundRule[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return ["환불 규정은 신청 확정 후 안내됩니다."];
  }

  const rules = value
    .map((rule) => {
      if (!rule.daysBefore && !rule.refundRate) return "";
      if (!rule.daysBefore) return `${rule.refundRate}% 환불`;
      if (!rule.refundRate) return `${rule.daysBefore}일 전 취소 시 환불 가능 여부 안내`;
      return `${rule.daysBefore}일 전 취소 시 ${rule.refundRate}% 환불`;
    })
    .filter(Boolean);

  return rules.length > 0 ? rules : ["환불 규정은 신청 확정 후 안내됩니다."];
}

function parseDateParts(value: string):
  | {
      day: number;
      month: number;
      year: number;
    }
  | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) return null;

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}
