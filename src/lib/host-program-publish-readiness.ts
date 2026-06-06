import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import type { HostProgramDraft, ProgramDraftChecklistItem } from "@/lib/host-program-studio";

type PublishReadinessOptions = {
  applicationForm?: ApplicationFormTemplate;
};

export function buildProgramPublishChecklist(
  draft: HostProgramDraft,
  options: PublishReadinessOptions = {},
): ProgramDraftChecklistItem[] {
  const recruitmentMethod = getProgramRecruitmentMethod(draft.applyUrl);
  const hasApplicationForm = Boolean(
    options.applicationForm &&
      options.applicationForm.formKind === "application" &&
      options.applicationForm.blocks.length > 0,
  );

  return [
    {
      done:
        draft.title.trim().length > 0 &&
        hasMeaningfulText(draft.capacity, ["TBD", "모집 인원"]) &&
        hasValidDate(draft.recruitEnd) &&
        hasValidDate(draft.activityStart) &&
        hasValidDate(draft.activityEnd),
      helper: "프로그램명, 모집 인원, 모집 마감일, 운영 기간을 입력해야 합니다.",
      id: "basic",
      label: "기본정보",
    },
    {
      done:
        hasMeaningfulSummary(draft.summary, draft.title) &&
        hasMeaningfulDescription(draft.description, draft.title, draft.summary) &&
        hasVisualAsset(draft.image),
      helper: "대표 사진, 짧은 요약, 상세 설명을 채워야 공개 화면이 비어 보이지 않습니다.",
      id: "detail",
      label: "상세정보",
    },
    {
      done: draft.itineraryDays.some(
        (day) =>
          day.summary.trim().length > 0 ||
          day.timetable.trim().length > 0 ||
          day.images.length > 0 ||
          day.image.trim().length > 0,
      ),
      helper: "일차별 일정, 타임테이블, 일정 사진 중 하나 이상을 작성해야 합니다.",
      id: "schedule",
      label: "일정안내",
    },
    {
      done:
        draft.region.trim().length > 0 &&
        draft.city.trim().length > 0 &&
        draft.placeInfo.meetingAddress.trim().length > 0,
      helper: "지역, 도시/장소, 집결지 주소가 필요합니다.",
      id: "place",
      label: "장소정보",
    },
    {
      done:
        recruitmentMethod === "none" ||
        (recruitmentMethod === "external"
          ? isExternalUrl(draft.applyUrl)
          : hasApplicationForm),
      helper:
        recruitmentMethod === "external"
          ? "외부 모집을 선택했다면 실제 신청 링크가 필요합니다."
          : "누비오에서 모집하려면 프로그램 신청폼을 먼저 연결해야 합니다.",
      id: "application-form",
      label: "신청 경로",
    },
    {
      done:
        hasMeaningfulText(draft.fee, ["TBD", "미정", "가격 미정"]) &&
        hasMeaningfulText(draft.phone, ["000-0000-0000"]) &&
        hasMeaningfulText(draft.sourceName, ["누비오 Host"]),
      helper: "참가비, 문의 연락처, 운영 기관명을 입력해야 합니다.",
      id: "operation",
      label: "안내사항",
    },
  ];
}

export function getProgramPublishBlockers(
  draft: HostProgramDraft,
  options: PublishReadinessOptions = {},
): ProgramDraftChecklistItem[] {
  return buildProgramPublishChecklist(draft, options).filter((item) => !item.done);
}

export function isProgramReadyToPublish(
  draft: HostProgramDraft,
  options: PublishReadinessOptions = {},
): boolean {
  return getProgramPublishBlockers(draft, options).length === 0;
}

export function getProgramRecruitmentMethod(
  applyUrl: string,
): "external" | "none" | "nuvio" {
  const url = applyUrl.trim();

  if (url === "#no-recruitment") return "none";
  if (!url || url.startsWith("/") || url.includes("nuvio.kr")) return "nuvio";

  return "external";
}

function hasValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value.trim());
}

function hasVisualAsset(value: string): boolean {
  const image = value.trim();
  if (!image) return false;
  return !image.includes("/brand/nuvio-logo-combined.svg");
}

function hasMeaningfulText(value: string, placeholders: string[] = []): boolean {
  const text = value.trim();
  if (!text) return false;
  return !placeholders.includes(text);
}

function hasMeaningfulSummary(summary: string, title: string): boolean {
  const text = summary.trim();
  return text.length >= 8 && text !== title.trim();
}

function hasMeaningfulDescription(
  description: string,
  title: string,
  summary: string,
): boolean {
  const text = description.trim();
  return text.length >= 20 && text !== title.trim() && text !== summary.trim();
}

function isExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
