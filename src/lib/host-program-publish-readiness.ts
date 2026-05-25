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
        draft.capacity.trim().length > 0 &&
        hasValidDate(draft.recruitEnd) &&
        hasValidDate(draft.activityStart) &&
        hasValidDate(draft.activityEnd),
      helper: "프로그램명, 모집 인원, 모집 마감일, 운영 기간을 입력해야 합니다.",
      id: "basic",
      label: "기본정보",
    },
    {
      done:
        draft.summary.trim().length >= 8 &&
        draft.description.trim().length >= 20 &&
        hasVisualAsset(draft.image),
      helper: "대표 사진, 짧은 요약, 상세 설명을 채워야 공개 화면이 비어 보이지 않습니다.",
      id: "detail",
      label: "상세정보",
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
        draft.fee.trim().length > 0 &&
        draft.phone.trim().length > 0 &&
        draft.sourceName.trim().length > 0,
      helper: "참가비, 문의 연락처, 운영 기관명을 입력해야 합니다.",
      id: "operation",
      label: "운영정보",
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

function isExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
