"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import {
  ArrowLeft,
  Bold,
  CalendarDays,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Plus,
  Redo2,
  Trash2,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { KakaoMap } from "@/components/kakao-map";
import { HostProgramSidebar } from "@/components/host-program-sidebar";
import { formatProgramDisplayCode } from "@/lib/display-code";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import {
  findHostProgramOverview,
  findHostProgramDraftOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  getHostProgramSidebarStatus,
  hostProgramId,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import {
  createHostProgramItineraryDay,
  mergeHostProgramDrafts,
  type HostProgramItineraryDay,
  type HostProgramGuideInfo,
  type HostProgramPlaceInfo,
  type HostProgramRefundRule,
  type HostProgramDraft,
  type ProgramDraftChecklistItem,
} from "@/lib/host-program-studio";
import { buildProgramPublishChecklist } from "@/lib/host-program-publish-readiness";
import {
  escapeCssUrl,
  formatCompactDateRange,
  formatKoreanDate as formatProgramKoreanDate,
  getProgramGalleryImages,
  getProgramGuideDetails,
  getProgramIntroParagraphs,
  getProgramPlaceDetails,
  getProgramScheduleItems,
} from "@/lib/program-detail-view-model";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import { getDday } from "@/lib/format";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { mergeReportProjects } from "@/lib/report-automation";
import type { Program, ProgramStatus, ThemeKey } from "@/lib/types";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type ProgramPanel =
  | "dashboard"
  | "basic"
  | "detail"
  | "schedule"
  | "place"
  | "guide"
  | "management"
  | "delete";

const themeOptions: Array<{ label: string; value: ThemeKey }> = [
  { label: "워케이션", value: "workation" },
  { label: "로컬 미션", value: "local" },
  { label: "짧은 여행", value: "short" },
  { label: "한 달 살기", value: "month" },
  { label: "귀농귀촌", value: "returnFarm" },
  { label: "공모/이벤트", value: "event" },
  { label: "반려동물", value: "pet" },
  { label: "반값여행", value: "half" },
  { label: "일상 지원금", value: "daily" },
  { label: "가족 여행", value: "family" },
  { label: "간편 신청", value: "easy" },
  { label: "전용 혜택", value: "benefit" },
  { label: "전용 이벤트", value: "exclusive" },
];

const lotteryApplicationApplyUrl = "#lottery-application";
const hostScreeningApplyUrl = "#host-screening-application";

type BasicApplicationMethod = "host" | "lottery" | "open";
type PriceMode = "free" | "paid" | "undecided";
type ProgramDashboardState = "creating" | "upcoming" | "open" | "ended";
type ProgramDashboardDialog =
  | "additional-recruitment"
  | "copy-program"
  | "delete"
  | "next-round"
  | "onboarding-required"
  | "open-schedule"
  | null;
type DashboardDeadlineMode = "auto" | "manual";

const figmaScaleStyle = {
  "--figma-scale":
    "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--figma-2": "clamp(2px, 0.139vw, 2.667px)",
  "--figma-4": "clamp(4px, 0.278vw, 5.333px)",
  "--figma-4-3": "clamp(4.3px, 0.299vw, 5.733px)",
  "--figma-5-7": "clamp(5.7px, 0.396vw, 7.6px)",
  "--figma-6": "clamp(6px, 0.417vw, 8px)",
  "--figma-7": "clamp(7px, 0.486vw, 9.333px)",
  "--figma-8": "clamp(8px, 0.556vw, 10.667px)",
  "--figma-9": "clamp(9px, 0.625vw, 12px)",
  "--figma-10": "clamp(10px, 0.694vw, 13.333px)",
  "--figma-12": "clamp(12px, 0.833vw, 16px)",
  "--figma-13": "clamp(13px, 0.903vw, 17.333px)",
  "--figma-14": "clamp(14px, 0.972vw, 18.667px)",
  "--figma-15": "clamp(15px, 1.042vw, 20px)",
  "--figma-16": "clamp(16px, 1.111vw, 21.333px)",
  "--figma-18": "clamp(18px, 1.25vw, 24px)",
  "--figma-19": "clamp(19px, 1.319vw, 25.333px)",
  "--figma-20": "clamp(20px, 1.389vw, 26.667px)",
  "--figma-21": "clamp(21px, 1.458vw, 28px)",
  "--figma-22": "clamp(22px, 1.528vw, 29.333px)",
  "--figma-23": "clamp(23px, 1.597vw, 30.667px)",
  "--figma-24": "clamp(24px, 1.667vw, 32px)",
  "--figma-26": "clamp(26px, 1.806vw, 34.667px)",
  "--figma-27": "clamp(27px, 1.875vw, 36px)",
  "--figma-28": "clamp(28px, 1.944vw, 37.333px)",
  "--figma-30": "clamp(30px, 2.083vw, 40px)",
  "--figma-31": "clamp(31px, 2.153vw, 41.333px)",
  "--figma-32": "clamp(32px, 2.222vw, 42.667px)",
  "--figma-35": "clamp(35px, 2.431vw, 46.667px)",
  "--figma-36": "clamp(36px, 2.5vw, 48px)",
  "--figma-40": "clamp(40px, 2.778vw, 53.333px)",
  "--figma-44": "clamp(44px, 3.056vw, 58.667px)",
  "--figma-45": "clamp(45px, 3.125vw, 60px)",
  "--figma-47": "clamp(47px, 3.264vw, 62.667px)",
  "--figma-50": "clamp(50px, 3.472vw, 66.667px)",
  "--figma-55": "clamp(55px, 3.819vw, 73.333px)",
  "--figma-57": "clamp(57px, 3.958vw, 76px)",
  "--figma-63": "clamp(63px, 4.375vw, 84px)",
  "--figma-69": "clamp(69px, 4.792vw, 92px)",
  "--figma-72": "clamp(72px, 5vw, 96px)",
  "--figma-82": "clamp(82px, 5.694vw, 109.333px)",
  "--figma-88": "clamp(88px, 6.111vw, 117.333px)",
  "--figma-96": "clamp(96px, 6.667vw, 128px)",
  "--figma-110": "clamp(110px, 7.639vw, 146.667px)",
  "--figma-111": "clamp(111px, 7.708vw, 148px)",
  "--figma-113": "clamp(113px, 7.847vw, 150.667px)",
  "--figma-152": "clamp(152px, 10.556vw, 202.667px)",
  "--figma-185": "clamp(185px, 12.847vw, 246.667px)",
  "--figma-193": "clamp(193px, 13.403vw, 257.333px)",
  "--figma-219": "clamp(219px, 15.208vw, 292px)",
  "--figma-228": "clamp(228px, 15.833vw, 304px)",
  "--figma-251": "clamp(251px, 17.431vw, 334.667px)",
  "--figma-256": "clamp(256px, 17.778vw, 341.333px)",
  "--figma-262": "clamp(262px, 18.194vw, 349.333px)",
  "--figma-379": "clamp(379px, 26.319vw, 505.333px)",
  "--figma-462": "clamp(462px, 32.083vw, 616px)",
} as CSSProperties;

function HostProgramFigmaScaleOverrides() {
  return (
    <style>{`
      [data-host-program-content-scale] .text-\\[7px\\] { font-size: var(--figma-7); }
      [data-host-program-content-scale] .text-\\[8px\\] { font-size: var(--figma-8); }
      [data-host-program-content-scale] .text-\\[9px\\] { font-size: var(--figma-9); }
      [data-host-program-content-scale] .text-\\[10px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-10\\)\\] { font-size: var(--figma-10); }
      [data-host-program-content-scale] .text-\\[12px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-12\\)\\] { font-size: var(--figma-12); }
      [data-host-program-content-scale] .text-\\[13px\\] { font-size: var(--figma-13); }
      [data-host-program-content-scale] .text-\\[14px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-14\\)\\] { font-size: var(--figma-14); }
      [data-host-program-content-scale] .text-\\[16px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-16\\)\\] { font-size: var(--figma-16); }
      [data-host-program-content-scale] .text-\\[18px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-18\\)\\] { font-size: var(--figma-18); }
      [data-host-program-content-scale] .text-\\[20px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-20\\)\\] { font-size: var(--figma-20); }
      [data-host-program-content-scale] .text-\\[24px\\],
      [data-host-program-content-scale] .text-\\[length\\:var\\(--figma-24\\)\\] { font-size: var(--figma-24); }
      [data-host-program-content-scale] .font-normal { font-weight: 400; }
      [data-host-program-content-scale] .font-medium { font-weight: 500; }
      [data-host-program-content-scale] .font-semibold { font-weight: 600; }
      [data-host-program-content-scale] .font-bold { font-weight: 700; }
      [data-host-program-content-scale] .font-black { font-weight: 900; }
      [data-host-program-content-scale] .leading-none { line-height: 1; }
      [data-host-program-content-scale] .leading-\\[1\\.25\\] { line-height: 1.25; }
      [data-host-program-content-scale] .leading-\\[1\\.253\\] { line-height: 1.253; }
      [data-host-program-content-scale] .leading-\\[1\\.28\\] { line-height: 1.28; }
      [data-host-program-content-scale] .leading-\\[1\\.3\\] { line-height: 1.3; }
      [data-host-program-content-scale] .leading-\\[1\\.35\\] { line-height: 1.35; }
      [data-host-program-content-scale] .leading-\\[1\\.45\\] { line-height: 1.45; }
      [data-host-program-content-scale] .leading-\\[1\\.46\\] { line-height: 1.46; }
      [data-host-program-content-scale] .leading-\\[1\\.6\\] { line-height: 1.6; }
      [data-host-program-content-scale] .leading-\\[1\\.7\\] { line-height: 1.7; }
      [data-host-program-content-scale] .preview-thumbnail-meta {
        font-size: var(--figma-8);
        line-height: 1.35;
      }
      [data-host-program-content-scale] .preview-thumbnail-meta img {
        height: var(--figma-9);
        width: var(--figma-9);
      }
      [data-host-program-content-scale] .preview-thumbnail-small-copy {
        font-size: var(--figma-4-3);
        line-height: 1.6;
      }
      [data-host-program-content-scale] .preview-thumbnail-small-title {
        font-size: var(--figma-5-7);
        line-height: 1.253;
      }
    `}</style>
  );
}

type KakaoPostcodeData = {
  address: string;
  apartment: "Y" | "N";
  bname: string;
  buildingName: string;
  jibunAddress: string;
  roadAddress: string;
  userSelectedType: "R" | "J";
  zonecode: string;
};

type KakaoPostcodeOptions = {
  height?: string;
  maxSuggestItems?: number;
  oncomplete: (data: KakaoPostcodeData) => void;
  width?: string;
};

type KakaoPostcodeInstance = {
  embed: (element: HTMLElement) => void;
  open: () => void;
};

declare global {
  interface Window {
    kakao?: {
      Postcode: new (options: KakaoPostcodeOptions) => KakaoPostcodeInstance;
    };
    daum?: {
      Postcode: new (options: KakaoPostcodeOptions) => KakaoPostcodeInstance;
    };
  }
}

const KAKAO_POSTCODE_SCRIPT_SRC =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const DAUM_POSTCODE_SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const ADDRESS_FALLBACK_OPTIONS = [
  "서울특별시 중구 세종대로 110",
  "서울특별시 종로구 세종대로 175",
  "서울특별시 강남구 테헤란로 152",
  "서울특별시 마포구 월드컵북로 396",
  "경기도 성남시 분당구 판교역로 166",
  "경기도 수원시 팔달구 효원로 241",
  "인천광역시 남동구 정각로 29",
  "부산광역시 해운대구 센텀중앙로 97",
  "대구광역시 중구 국채보상로 648",
  "광주광역시 서구 내방로 111",
  "대전광역시 서구 둔산로 100",
  "제주특별자치도 제주시 문연로 6",
];

let kakaoPostcodeScriptPromise: Promise<void> | null = null;

export function HostProgramHub({
  programId,
  projectId,
}: {
  programId: string;
  projectId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    applications,
    isLoading,
    programs: hostPrograms,
    reportProjects,
    setPrograms,
    setReportProjects,
  } = useHostOperationsData();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [applicationForms, setApplicationForms] = useState<ApplicationFormTemplate[]>([]);
  const [dashboardDialog, setDashboardDialog] =
    useState<ProgramDashboardDialog>(null);
  const [scheduledOpenDate, setScheduledOpenDate] = useState("");
  const [scheduledCloseDate, setScheduledCloseDate] = useState("");
  const [scheduledDeadlineMode, setScheduledDeadlineMode] =
    useState<DashboardDeadlineMode>("manual");
  const [copyProgramTitle, setCopyProgramTitle] = useState("");
  const [additionalRecruitEnd, setAdditionalRecruitEnd] = useState("");
  const [additionalCapacity, setAdditionalCapacity] = useState("");
  const [nextRoundNumber, setNextRoundNumber] = useState("");
  const [nextRoundOpenDate, setNextRoundOpenDate] = useState("");
  const [nextRoundCloseDate, setNextRoundCloseDate] = useState("");
  const [nextRoundCapacity, setNextRoundCapacity] = useState("");

  const activePanel = normalizePanel(searchParams.get("panel"));
  const project = useMemo(
    () =>
      projectId
        ? findHostProjectOverview(projectId, applications, reportProjects, hostPrograms)
        : undefined,
    [applications, hostPrograms, projectId, reportProjects],
  );
  const program = useMemo(
    () => {
      if (projectId) {
        const projectProgram = findHostProgramOverview(
          projectId,
          programId,
          applications,
          reportProjects,
          hostPrograms,
        );
        if (projectProgram) return projectProgram;
      }

      return (
        findStandaloneHostProgramOverview(
          programId,
          applications,
          reportProjects,
          hostPrograms,
        ) ??
        findHostProgramDraftOverview(
          programId,
          applications,
          hostPrograms,
        )
      );
    },
    [applications, hostPrograms, programId, projectId, reportProjects],
  );
  const draft = useMemo(
    () => findProgramDraft(hostPrograms, programId, program),
    [hostPrograms, program, programId],
  );
  const projectPath = projectId ? hostProjectPath(projectId) : "/host/programs";
  const programPath =
    projectId && program
      ? hostProgramPath(projectId, program.id)
      : hostStandaloneProgramPath(program?.id ?? programId);
  const applicationsHref = `${programPath}/applications`;
  const formsHref = `${programPath}/forms`;
  const messagesHref = `${programPath}/messages`;
  const deletePanelMetrics = useMemo(() => {
    const programApplications = program?.applications ?? [];
    const paidApplications = programApplications.filter(
      (application) => application.paymentAmount > 0,
    );
    const paymentRecords = programApplications.filter(
      (application) => application.paymentAmount > 0 || application.receiptCount > 0,
    );

    return {
      alarmSubscriberCount: 0,
      applicationCount: programApplications.length,
      paidApplicantCount: paidApplications.length,
      paymentRecordCount: paymentRecords.length,
      reviewCount: programApplications.filter((application) => application.reviewSubmitted)
        .length,
    };
  }, [program?.applications]);
  const linkedApplicationForm = useMemo(() => {
    if (!draft) return undefined;

    return applicationForms.find((form) => isLinkedApplicationForm(form, draft));
  }, [applicationForms, draft]);
  const publishChecklist = useMemo(
    () =>
      draft
        ? buildProgramPublishChecklist(draft, {
            applicationForm: linkedApplicationForm,
          })
        : [],
    [draft, linkedApplicationForm],
  );
  const publishBlockers = useMemo(
    () => publishChecklist.filter((item) => !item.done),
    [publishChecklist],
  );
  const readyToPublish = draft ? publishBlockers.length === 0 : false;
  const dashboardState = getProgramDashboardState(
    draft?.status ?? program?.status,
    readyToPublish,
  );
  const canDeleteBeforeOnboarding = Boolean(draft && !readyToPublish);

  useEffect(() => {
    let isMounted = true;

    async function loadApplicationForms() {
      try {
        const response = await fetch("/api/host/forms?kind=application", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const forms = Array.isArray(payload.data) ? payload.data : [];
        if (isMounted) setApplicationForms(forms);
      } catch {
        // The server-side publish guard still catches missing forms.
      }
    }

    void loadApplicationForms();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading && !program) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="rounded-md border border-[#F3E2D5] bg-white p-6 text-sm font-black text-[#8B7A6E]">
          프로그램을 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          {projectId ? "폴더" : "프로그램 목록"}
        </Link>
        <div className="mt-5 rounded-md border border-[#F3E2D5] bg-white p-6">
          <h1 className="text-2xl font-black text-[#0D0D0C]">
            프로그램을 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  function updateDraft(patch: Partial<HostProgramDraft>) {
    if (!draft) return;

    const nextDraft = {
      ...draft,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    setSaveMessage("");
    setSaveError("");
    setPrograms((current) =>
      mergeHostProgramDrafts(
        [nextDraft],
        current.filter((item) => item.id !== draft.id),
      ),
    );
  }

  async function persistDraft(nextDraft: HostProgramDraft, successMessage: string) {
    if (isSaving || !nextDraft.title.trim()) return;

    if (nextDraft.published && publishBlockers.length > 0) {
      setSaveMessage("");
      setSaveError(
        `공개하기 전에 ${publishBlockers.map((item) => item.label).join(", ")}을(를) 완료해 주세요.`,
      );
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/host/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDraft),
      });
      const payload = (await response.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "프로그램 저장에 실패했습니다.");
      }

      setPrograms((current) =>
        mergeHostProgramDrafts(
          [payload.data as HostProgramDraft],
          current.filter((item) => item.id !== nextDraft.id),
        ),
      );
      setSaveMessage(successMessage);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "프로그램 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    await persistDraft(draft, "저장되었습니다.");
  }

  async function scheduleProgramOpen() {
    if (!draft || !readyToPublish) {
      setDashboardDialog("onboarding-required");
      return;
    }

    await persistDraft(
      {
        ...draft,
        published: true,
        recruitStart: scheduledOpenDate || draft.recruitStart,
        recruitEnd:
          scheduledDeadlineMode === "manual"
            ? scheduledCloseDate || draft.recruitEnd
            : draft.recruitEnd,
        status: "upcoming",
        updatedAt: new Date().toISOString(),
      },
      "오픈 예약이 저장되었습니다.",
    );
    setDashboardDialog(null);
  }

  async function copyProgram() {
    if (!draft) return;

    const now = Date.now();
    const copiedDraft: HostProgramDraft = {
      ...draft,
      id: `draft-copy-${now}`,
      published: false,
      slug: undefined,
      status: "upcoming",
      title: copyProgramTitle.trim() || `${draft.title} (2)`,
      updatedAt: new Date().toISOString(),
    };

    await persistDraft(copiedDraft, "프로그램이 복사되었습니다.");
    setDashboardDialog(null);
  }

  async function startAdditionalRecruitment() {
    if (!draft) return;

    const additionalCount = parsePositiveInteger(additionalCapacity);
    const nextCapacity =
      additionalCount > 0
        ? formatCapacityCount(extractCapacityCount(draft.capacity) + additionalCount)
        : draft.capacity;

    await persistDraft(
      {
        ...draft,
        capacity: nextCapacity,
        published: true,
        recruitEnd: additionalRecruitEnd || draft.recruitEnd,
        status: "open",
        updatedAt: new Date().toISOString(),
      },
      "추가 모집이 시작되었습니다.",
    );
    setDashboardDialog(null);
  }

  async function startNextRound() {
    if (!draft) return;

    const roundNumber = parsePositiveInteger(nextRoundNumber);
    const nextTitle =
      roundNumber > 0 ? `${stripRoundSuffix(draft.title)} ${roundNumber}기` : draft.title;

    await persistDraft(
      {
        ...draft,
        activityStart: nextRoundOpenDate || draft.activityStart,
        activityEnd: nextRoundCloseDate || draft.activityEnd,
        capacity: nextRoundCapacity.trim()
          ? formatCapacityCount(parsePositiveInteger(nextRoundCapacity))
          : draft.capacity,
        published: true,
        recruitStart: nextRoundOpenDate || draft.recruitStart,
        recruitEnd: nextRoundCloseDate || draft.recruitEnd,
        status: "upcoming",
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      },
      "다음 기수 모집이 준비되었습니다.",
    );
    setDashboardDialog(null);
  }

  async function deleteProgram({
    allowCompleted = false,
  }: {
    allowCompleted?: boolean;
  } = {}) {
    if (!draft || isDeleting) return;
    if (!allowCompleted && !canDeleteBeforeOnboarding) return;

    setIsDeleting(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch(
        `/api/host/programs/${encodeURIComponent(draft.id)}${
          allowCompleted ? "?mode=management" : ""
        }`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "프로그램을 삭제하지 못했습니다.");
      }

      setPrograms((current) => current.filter((item) => item.id !== draft.id));

      if (projectId && project?.reportProject) {
        const nextProject = {
          ...project.reportProject,
          connectedProgramIds: project.reportProject.connectedProgramIds.filter(
            (id) => id !== draft.id,
          ),
          connectedProgramTitles: project.reportProject.connectedProgramTitles.filter(
            (title) => title !== draft.title,
          ),
          programId:
            project.reportProject.programId === draft.id
              ? ""
              : project.reportProject.programId,
          programTitle:
            project.reportProject.programTitle === draft.title
              ? "전체 프로그램"
              : project.reportProject.programTitle,
          updatedAt: new Date().toISOString(),
        };

        const reportResponse = await fetch("/api/host/reports", {
          body: JSON.stringify(nextProject),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const reportPayload = (await reportResponse.json()) as {
          data?: typeof nextProject;
          error?: string;
        };

        const savedProject = reportPayload.data;
        if (reportResponse.ok && savedProject) {
          setReportProjects((current) => mergeReportProjects([savedProject], current));
        }
      }

      router.push(projectPath);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "프로그램을 삭제하지 못했습니다.",
      );
    } finally {
      setDashboardDialog(null);
      setIsDeleting(false);
    }
  }

  const currentUpdatedAt = draft?.updatedAt ?? program.updatedAt;
  const embeddedPreviewPanel =
    activePanel === "detail" ||
    activePanel === "schedule" ||
    activePanel === "place" ||
    activePanel === "guide";
  const showUpdatedAtHeader = activePanel === "basic";
  const showPreviewRail = false;
  const dashboardPanelActive = activePanel === "dashboard";

  function openScheduleDialog() {
    if (!readyToPublish) {
      setDashboardDialog("onboarding-required");
      return;
    }

    setScheduledOpenDate(draft?.recruitStart || new Date().toISOString().slice(0, 10));
    setScheduledCloseDate(draft?.recruitEnd || "");
    setScheduledDeadlineMode("manual");
    setDashboardDialog("open-schedule");
  }

  function openCopyProgramDialog() {
    setCopyProgramTitle(draft ? `${draft.title} (2)` : "");
    setDashboardDialog("copy-program");
  }

  function openAdditionalRecruitmentDialog() {
    setAdditionalRecruitEnd(draft?.recruitEnd || "");
    setAdditionalCapacity("");
    setDashboardDialog("additional-recruitment");
  }

  function openNextRoundDialog() {
    setNextRoundNumber("");
    setNextRoundOpenDate(draft?.activityStart || "");
    setNextRoundCloseDate(draft?.activityEnd || "");
    setNextRoundCapacity(extractCapacityCount(draft?.capacity ?? "").toString());
    setDashboardDialog("next-round");
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#33241C]"
      data-host-program-scale
      style={figmaScaleStyle}
    >
      <HostProgramFigmaScaleOverrides />
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <HostProgramSidebar
          activeItem={activePanel}
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          programId={program.id}
          programPath={programPath}
          status={getHostProgramSidebarStatus(program, draft)}
          title={draft?.title || program.title}
        />

        <section
          className="flex min-w-0 flex-1 flex-col"
          data-host-program-content-scale
        >
          {showUpdatedAtHeader ? (
          <div className="ml-[2.778vw] flex h-[var(--figma-96)] w-[64.236vw] max-w-[1233px] items-start justify-end pt-[var(--figma-44)] text-[length:var(--figma-16)] font-normal leading-[1.253] text-[#6D7A8A]">
            최근 수정일 : {formatDateTime(currentUpdatedAt)}
          </div>
          ) : null}

          <div
            className={`grid flex-1 min-w-0 ${
              showPreviewRail
                ? "xl:grid-cols-[minmax(0,67.014vw)_minmax(300px,17.153vw)]"
                : ""
            }`}
          >
            <main
              className={
                dashboardPanelActive
                  ? "min-w-0 pb-0"
                  : embeddedPreviewPanel
                    ? "min-w-0 pl-[2.778vw] pr-0 pb-0 max-md:px-5"
                  : "min-w-0 px-[2.778vw] pb-0 max-md:px-5"
              }
            >
              {!dashboardPanelActive &&
              !embeddedPreviewPanel &&
              (saveMessage || saveError || !draft) ? (
              <div className="min-h-[var(--figma-28)]">
                {saveMessage ? (
                  <p className="text-[14px] font-black text-[#FE701E]">
                    {saveMessage}
                  </p>
                ) : null}
                {saveError ? (
                  <p className="text-[14px] font-black text-red-600">
                    {saveError}
                  </p>
                ) : null}
                {!draft ? (
                  <p className="text-[14px] font-bold text-red-600">
                    이 프로그램은 아직 편집 가능한 초안 데이터가 없습니다.
                  </p>
                ) : null}
              </div>
              ) : null}

              <div className={dashboardPanelActive ? "" : showPreviewRail ? "pt-[1.528vw]" : ""}>
                {activePanel === "dashboard" ? (
                  <DashboardPanel
                    dashboardState={dashboardState}
                    draft={draft}
                    formsHref={formsHref}
                    onAdditionalRecruitment={openAdditionalRecruitmentDialog}
                    onOpenSchedule={openScheduleDialog}
                    publishChecklist={publishChecklist}
                    program={program}
                    programPath={programPath}
                  />
                ) : null}
                {draft && activePanel === "basic" ? (
                  <BasicPanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "detail" ? (
                  <DetailPanel
                    draft={draft}
                    updatedAt={currentUpdatedAt}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "schedule" ? (
                  <SchedulePanel
                    draft={draft}
                    updatedAt={currentUpdatedAt}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "place" ? (
                  <PlacePanel
                    draft={draft}
                    updatedAt={currentUpdatedAt}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "guide" ? (
                  <GuidePanel
                    draft={draft}
                    updatedAt={currentUpdatedAt}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "management" ? (
                  <ManagementPanel
                    draft={draft}
                    publishBlockers={publishBlockers}
                    readyToPublish={readyToPublish}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "delete" ? (
                  <DeletePanel
                    applicationCount={deletePanelMetrics.applicationCount}
                    draft={draft}
                    alarmSubscriberCount={deletePanelMetrics.alarmSubscriberCount}
                    isDeleting={isDeleting}
                    onDelete={() => void deleteProgram({ allowCompleted: true })}
                    paidApplicantCount={deletePanelMetrics.paidApplicantCount}
                    paymentRecordCount={deletePanelMetrics.paymentRecordCount}
                    receiptsHref={`${applicationsHref}?panel=receipts`}
                    reviewCount={deletePanelMetrics.reviewCount}
                  />
                ) : null}
              </div>
            </main>

            {showPreviewRail && draft ? (
              <ProgramBuilderPreviewRail draft={draft} panel={activePanel} />
            ) : null}
          </div>

          {dashboardPanelActive ? (
            <DashboardFooter
              canDelete={canDeleteBeforeOnboarding}
              dashboardState={dashboardState}
              onDelete={() => setDashboardDialog("delete")}
              onNextRound={openNextRoundDialog}
              onOpenSchedule={openScheduleDialog}
              onProgramCopy={openCopyProgramDialog}
              onSave={() => void saveDraft()}
            />
          ) : activePanel === "delete" || activePanel === "management" ? null : (
          <div className="flex w-full border-t border-[#6D7A8A] bg-white px-[1.944vw] py-[1.389vw]">
            <button
              className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[19px] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draft || !draft.title.trim() || isSaving}
              onClick={() => void saveDraft()}
              type="button"
            >
              {isSaving ? "저장 중" : "저장하기"}
            </button>
          </div>
          )}
        </section>
      </div>
      {dashboardDialog === "onboarding-required" ? (
        <OnboardingRequiredDialog
          blockers={publishBlockers}
          formsHref={formsHref}
          onClose={() => setDashboardDialog(null)}
          programPath={programPath}
        />
      ) : null}
      {dashboardDialog === "open-schedule" && draft ? (
        <OpenScheduleDialog
          deadlineMode={scheduledDeadlineMode}
          isSaving={isSaving}
          onDeadlineModeChange={setScheduledDeadlineMode}
          onClose={() => setDashboardDialog(null)}
          onSchedule={() => void scheduleProgramOpen()}
          onScheduledCloseDateChange={setScheduledCloseDate}
          onScheduledDateChange={setScheduledOpenDate}
          scheduledCloseDate={scheduledCloseDate}
          scheduledDate={scheduledOpenDate}
        />
      ) : null}
      {dashboardDialog === "copy-program" && draft ? (
        <CopyProgramDialog
          isSaving={isSaving}
          onClose={() => setDashboardDialog(null)}
          onCopy={() => void copyProgram()}
          onTitleChange={setCopyProgramTitle}
          title={copyProgramTitle}
        />
      ) : null}
      {dashboardDialog === "additional-recruitment" && draft ? (
        <AdditionalRecruitmentDialog
          approvedCount={program.activeCount}
          capacity={draft.capacity}
          currentEndDate={draft.recruitEnd}
          endDate={additionalRecruitEnd}
          isSaving={isSaving}
          onCapacityChange={setAdditionalCapacity}
          onClose={() => setDashboardDialog(null)}
          onEndDateChange={setAdditionalRecruitEnd}
          onStart={() => void startAdditionalRecruitment()}
          requestedCapacity={additionalCapacity}
        />
      ) : null}
      {dashboardDialog === "next-round" && draft ? (
        <NextRoundDialog
          capacity={nextRoundCapacity}
          closeDate={nextRoundCloseDate}
          currentRoundDateRange={formatDashboardDateRange(
            draft.activityStart,
            draft.activityEnd,
          )}
          currentRoundNumber={extractRoundNumber(draft.title)}
          currentCapacity={draft.capacity}
          isSaving={isSaving}
          onCapacityChange={setNextRoundCapacity}
          onClose={() => setDashboardDialog(null)}
          onCloseDateChange={setNextRoundCloseDate}
          onOpenDateChange={setNextRoundOpenDate}
          onRoundNumberChange={setNextRoundNumber}
          onStart={() => void startNextRound()}
          openDate={nextRoundOpenDate}
          roundNumber={nextRoundNumber}
        />
      ) : null}
      {dashboardDialog === "delete" && draft ? (
        <DeleteProgramDialog
          canDelete={canDeleteBeforeOnboarding}
          isDeleting={isDeleting}
          onClose={() => setDashboardDialog(null)}
          onDelete={() => void deleteProgram()}
          programTitle={draft.title}
        />
      ) : null}
    </div>
  );
}

function ProgramBuilderPreviewRail({
  draft,
  panel,
}: {
  draft: HostProgramDraft;
  panel: ProgramPanel;
}) {
  const programPeriod = formatProgramPeriod(draft.activityStart, draft.activityEnd);
  const recruitDeadline = draft.recruitEnd
    ? `~${formatKoreanDate(draft.recruitEnd)}`
    : "~모집 마감일 미정";
  const dayCount = Math.max(draft.itineraryDays.length, 1);

  return (
    <aside className="hidden border-l border-[#AEB8C2] bg-[#FBFAF9] px-[1.389vw] py-[1.528vw] xl:block">
      <div className="sticky top-[1.528vw] grid gap-[1.111vw]">
        <p className="text-center text-[13px] font-black text-[#7C8794]">
          미리보기
        </p>

        <section className="rounded-[5px] border border-[#F2D7C7] bg-white p-[1.111vw]">
          <div className="rounded-[5px] border border-[#F2D7C7] px-[0.833vw] py-[0.694vw]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[0.833vw] text-[12px] font-bold text-[#6D7A8A]">
              <div className="flex min-w-0 items-center gap-[0.625vw]">
                <span className="font-black text-[#33241C]">일정</span>
                <span className="min-w-0 whitespace-nowrap">{programPeriod}</span>
              </div>
              <span className="whitespace-nowrap border-l border-[#F2D7C7] pl-[0.833vw]">
                모집 {draft.capacity || "TBD"}
              </span>
            </div>
          </div>

          <p className="mt-[0.556vw] text-right text-[12px] font-bold text-[#6D7A8A]">
            {recruitDeadline}
          </p>
          <div className="mt-[0.972vw] flex items-center justify-between text-[13px] font-black">
            <span className="text-[#FE701E]">자유신청</span>
            <span className="text-[#75883F]">D-20</span>
          </div>
          <h3 className="mt-[0.417vw] text-[16px] font-black leading-6 text-[#33241C]">
            {draft.title || "프로그램 이름"}
          </h3>
          <p className="mt-[0.694vw] text-[18px] font-black text-[#33241C]">
            {draft.fee || "TBD"} <span className="text-[12px] text-[#AEB8C2]">/명</span>
          </p>
          <div className="mt-[1.111vw] rounded-[4px] bg-[#F6F6F6] p-[0.694vw]">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#7C8794]">
              <span>신청 인원</span>
              <span>00</span>
            </div>
            <div className="mt-[0.556vw] flex items-center justify-between border-t border-[#F2D7C7] pt-[0.556vw] text-[16px] font-black text-[#33241C]">
              <span>총액</span>
              <span>{draft.fee || "TBD"}</span>
            </div>
          </div>
          <button
            className="mt-[0.833vw] h-[2.014vw] min-h-[32px] w-full rounded-[4px] bg-[#FE701E] text-[13px] font-black text-white"
            type="button"
          >
            신청하기
          </button>
        </section>

        <section className="rounded-[5px] border border-[#F2D7C7] bg-white p-[1.111vw]">
          <div
            className="aspect-[4/3] rounded-[3px] bg-[#D9D9D9] bg-cover bg-center"
            style={draft.image ? { backgroundImage: `url("${draft.image}")` } : undefined}
          />
          <h3 className="mt-[0.833vw] text-[15px] font-black leading-6 text-[#33241C]">
            {panel === "schedule" ? `${dayCount}일차 일정 안내` : "상세 페이지 본문"}
          </h3>
          {panel === "schedule" ? (
            <div className="mt-[0.694vw] grid gap-2">
              {draft.itineraryDays.slice(0, 3).map((day, index) => (
                <div
                  className="rounded-[4px] bg-[#F6F6F6] px-3 py-2 text-[12px] font-bold leading-5 text-[#6D7A8A]"
                  key={day.id}
                >
                  <span className="font-black text-[#FE701E]">{index + 1}일차</span>{" "}
                  {day.title || "일정 요약"}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-[0.694vw] max-h-24 overflow-hidden text-[12px] font-bold leading-5 text-[#6D7A8A]">
              {draft.summary || draft.description || "프로그램 소개가 이 영역에 표시됩니다."}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

function DashboardPanel({
  dashboardState,
  draft,
  formsHref,
  onAdditionalRecruitment,
  onOpenSchedule,
  publishChecklist,
  program,
  programPath,
}: {
  dashboardState: ProgramDashboardState;
  draft?: HostProgramDraft;
  formsHref: string;
  onAdditionalRecruitment: () => void;
  onOpenSchedule: () => void;
  publishChecklist: ProgramDraftChecklistItem[];
  program: HostProgramOverview;
  programPath: string;
}) {
  const onboardingSteps = buildDashboardOnboardingSteps(
    publishChecklist,
    draft,
    programPath,
    formsHref,
  );
  const completedCount = onboardingSteps.filter((item) => item.done).length;
  const totalCount = onboardingSteps.length;
  const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const statusMeta = getDashboardStateMeta(dashboardState);

  if (dashboardState !== "creating") {
    return (
      <DashboardStatusPanel
        dashboardState={dashboardState}
        draft={draft}
        onAdditionalRecruitment={onAdditionalRecruitment}
        onOpenSchedule={onOpenSchedule}
        program={program}
        statusMeta={statusMeta}
      />
    );
  }

  return (
    <div
      className="flex flex-col gap-[2.222vw] pl-[2.778vw] pt-[4.167vw]"
      data-program-dashboard={dashboardState}
      style={figmaScaleStyle}
    >
      <section className="flex w-[64.236vw] max-w-[1233px] items-start gap-[3.056vw] rounded-[8px] border border-[#6D7A8A] px-[1.528vw] py-[1.667vw]">
        <div
          className="h-[7.5vw] max-h-[144px] min-h-[108px] w-[7.222vw] min-w-[104px] max-w-[139px] shrink-0 rounded-[16px] bg-[#D9D9D9] bg-cover bg-center"
          style={draft?.image ? { backgroundImage: `url("${draft.image}")` } : undefined}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1.319vw] self-stretch text-[#0D0D0C]">
          <h1 className="text-[24px] font-medium leading-[1.253]">
            {program.title || "프로그램 제목"}
          </h1>
          <p className="text-[16px] font-normal leading-[1.253]">
            프로그램 코드 : {formatProgramNumber(program.id)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-[6px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] ${statusMeta.badgeClassName}`}
        >
          {statusMeta.label}
        </span>
      </section>

      <section className="flex w-[64.236vw] max-w-[1233px] flex-col gap-[1.319vw]">
        <div className="flex w-full items-center justify-between text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
          <p>프로그램 완성도</p>
          <p>
            {completedCount}/{totalCount} 완료
          </p>
        </div>
        <div className="h-[6px] w-full bg-[#D9D9D9]">
          <div
            className="h-full bg-[#FE701E]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[16px] font-medium leading-[1.253] text-[#6D7A8A]">
          모든 필수 항목들이 작성 완료되면 [오픈 예약하기]를 눌러 프로그램를 오픈할 수 있어요.
        </p>
      </section>

      <section className="flex w-[59.167vw] max-w-[1136px] flex-col gap-[1.736vw]">
        {onboardingSteps.map((step) => (
          <DashboardChecklistRow key={step.id} step={step} />
        ))}
      </section>
    </div>
  );
}

function DashboardStatusPanel({
  dashboardState,
  draft,
  onAdditionalRecruitment,
  onOpenSchedule,
  program,
  statusMeta,
}: {
  dashboardState: Exclude<ProgramDashboardState, "creating">;
  draft?: HostProgramDraft;
  onAdditionalRecruitment: () => void;
  onOpenSchedule: () => void;
  program: HostProgramOverview;
  statusMeta: ReturnType<typeof getDashboardStateMeta>;
}) {
  const status = draft?.status ?? program.status ?? "upcoming";
  const activityRange = draft
    ? formatDashboardDateRange(draft.activityStart, draft.activityEnd)
    : "0000년 00월 00일 - 00월 00일";
  const recruitRange = draft
    ? formatDashboardDateRange(draft.recruitStart, draft.recruitEnd)
    : "0000년 00월 00일 - 00월 00일";
  const recruitDays = draft
    ? countDateDays(draft.recruitStart, draft.recruitEnd)
    : 0;
  const openDday = draft ? getDashboardDday(draft.recruitStart, status) : "D - 00";
  const deadlineDday = draft ? getDday(draft.recruitEnd, status) : "D - 00";
  const acceptedCount = program.activeCount;
  const pendingCount = program.pendingCount;
  const applicationRows = program.applications.slice(0, 3);
  const reviewRows = program.applications
    .filter((application) => application.reviewSubmitted)
    .slice(0, 3);

  return (
    <div
      className="flex flex-col gap-[var(--figma-32)] pl-[var(--figma-40)] pt-[var(--figma-44)]"
      data-program-dashboard={dashboardState}
      style={figmaScaleStyle}
    >
      <div className="flex w-[64.236vw] max-w-[1233px] items-center justify-end text-[16px] font-normal leading-[1.253] text-[#6D7A8A]">
        최근 수정일 : {formatDateTime(draft?.updatedAt ?? program.updatedAt)}
      </div>

      <section className="flex w-[64.236vw] max-w-[1233px] items-start justify-end gap-[var(--figma-44)] rounded-[8px] border border-[#6D7A8A] px-[var(--figma-22)] py-[var(--figma-24)]">
        <div
          className="h-[15.649vw] max-h-[301px] min-h-[225px] w-[15.069vw] min-w-[217px] max-w-[289px] shrink-0 rounded-[16px] bg-[#D9D9D9] bg-cover bg-center"
          style={
            draft?.image || program.imageUrl
              ? { backgroundImage: `url("${escapeCssUrl(draft?.image || program.imageUrl)}")` }
              : undefined
          }
        />
        <div className="flex w-[43.056vw] max-w-[827px] min-w-[620px] flex-col items-center gap-[var(--figma-8)]">
          <div className="flex w-full justify-end">
            <span
              className={`shrink-0 rounded-[6px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] ${statusMeta.badgeClassName}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <h1 className="w-full text-[24px] font-medium leading-[1.253] text-[#0D0D0C]">
            {program.title || draft?.title || "프로그램 제목"}
          </h1>
          <div className="flex w-full items-start gap-[var(--figma-8)] text-[16px] font-normal leading-[1.253] text-[#0D0D0C]">
            <p className="shrink-0 whitespace-nowrap">
              프로그램 코드 : {formatProgramNumber(program.id)}
            </p>
            <p className="min-w-0 flex-1 text-center">
              프로그램 진행일 : {activityRange}
            </p>
          </div>

          <div className="flex w-full items-center gap-[var(--figma-12)]">
            {dashboardState === "upcoming" ? (
              <>
                <DashboardSummaryCard
                  actionLabel="오픈일 수정"
                  label="오픈 예정일"
                  onAction={onOpenSchedule}
                  primary={formatDashboardDate(draft?.recruitStart)}
                  value={openDday}
                />
                <DashboardSummaryCard
                  actionLabel="모집기간 수정"
                  label="프로그램 모집 기간"
                  onAction={onOpenSchedule}
                  primary={`${recruitRange} (${recruitDays}일)`}
                  value={`${recruitDays} 일`}
                />
              </>
            ) : dashboardState === "open" ? (
              <>
                <DashboardSummaryCard
                  label="프로그램 모집 기간"
                  primary={`${recruitRange} (${recruitDays}일)`}
                  value={`${recruitDays} 일`}
                />
                <DashboardSummaryCard
                  actionLabel="마감일 수정"
                  label="마감 예정일"
                  onAction={onAdditionalRecruitment}
                  primary={formatDashboardDate(draft?.recruitEnd)}
                  value={deadlineDday.replace(/^D-/u, "D - ")}
                />
              </>
            ) : (
              <>
                <DashboardSummaryCard
                  label="프로그램 모집 기간"
                  primary={`${recruitRange} (${recruitDays}일)`}
                  value={`${recruitDays} 일`}
                />
                <DashboardSummaryCard
                  actionLabel="추가모집"
                  label="마감"
                  onAction={onAdditionalRecruitment}
                  primary={formatDashboardDate(draft?.recruitEnd)}
                  value=""
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid w-[64.236vw] max-w-[1233px] grid-cols-4 gap-[var(--figma-10)]">
        <DashboardMetricCard
          helper={`승인 ${acceptedCount}/${extractCapacityCount(draft?.capacity ?? "") || "00"}`}
          label="신청자"
          value={`${program.applicationCount}`}
          valueSuffix="명"
        />
        <DashboardMetricCard label="검토 대기" value={`${pendingCount}`} valueSuffix="건" />
        <DashboardMetricCard label="미확인 메세지" value="0" valueSuffix="건" />
        <DashboardMetricCard label="저장" value="0" valueSuffix="회" />
      </section>

      <section className="flex w-[64.236vw] max-w-[1233px] items-center gap-[var(--figma-12)]">
        <DashboardListCard
          emptyText="아직 받은 신청서가 없어요"
          rows={applicationRows.map((application) => ({
            badge: application.status === "accepted" ? "승인" : application.status === "rejected" ? "거절" : "검토대기",
            badgeTone:
              application.status === "accepted"
                ? "green"
                : application.status === "rejected"
                  ? "slate"
                  : "orange",
            date: formatDashboardDate(application.submittedAt),
            title: application.applicantName,
          }))}
          title={`받은 신청서 (${padDashboardCount(program.applicationCount)})`}
        />
        {launchFeatureFlags.reviews ? (
          <DashboardListCard
            emptyText="아직 받은 후기가 없어요"
            rows={reviewRows.map((application, index) => ({
              badge: index === 0 ? "새로뜬 후기" : undefined,
              badgeTone: "red",
              date: formatDashboardDate(application.submittedAt),
              title: application.applicantName,
            }))}
            title={`받은 후기 (${padDashboardCount(reviewRows.length)})`}
          />
        ) : null}
      </section>
    </div>
  );
}

function DashboardSummaryCard({
  actionLabel,
  label,
  onAction,
  primary,
  value,
}: {
  actionLabel?: string;
  label: string;
  onAction?: () => void;
  primary: string;
  value: string;
}) {
  return (
    <div className="flex h-[9.167vw] min-h-[132px] max-h-[176px] min-w-0 flex-1 flex-col justify-center gap-[var(--figma-6)] rounded-[8px] border border-[#6D7A8A] px-[var(--figma-6)]">
      {actionLabel ? (
        <div className="flex w-full justify-end px-[var(--figma-12)]">
          <button
            className="rounded-[12px] bg-[#FFF6EC] px-[8px] py-[2px] text-[12px] font-medium leading-[1.253] text-[#6D7A8A]"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
      <div className="flex w-full items-center px-[var(--figma-12)] py-[var(--figma-2)]">
        <p className="text-[16px] font-medium leading-[1.253] text-[#6D7A8A]">
          {label}
        </p>
      </div>
      <div className="flex w-full items-center justify-between gap-[var(--figma-12)] px-[var(--figma-16)] text-[#0D0D0C]">
        <p className="min-w-0 whitespace-pre-line text-[16px] font-semibold leading-[1.253]">
          {primary}
        </p>
        {value ? (
          <p className="shrink-0 text-[24px] font-medium leading-[1.253] text-[#FF9A3D]">
            {value}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DashboardMetricCard({
  helper,
  label,
  value,
  valueSuffix,
}: {
  helper?: string;
  label: string;
  value: string;
  valueSuffix: string;
}) {
  return (
    <div className="flex h-[9.167vw] min-h-[132px] max-h-[176px] flex-col items-center justify-center rounded-[8px] border border-[#6D7A8A]">
      <div className="flex flex-col gap-[var(--figma-6)] px-[var(--figma-6)] py-[var(--figma-2)]">
        <div className="flex items-center gap-[var(--figma-8)] whitespace-nowrap text-[16px] font-medium leading-[1.253]">
          <span className="text-[#6D7A8A]">{label}</span>
          <span className="text-[24px] text-[#FF9A3D]">
            {padDashboardCount(value)} {valueSuffix}
          </span>
        </div>
        {helper ? (
          <p className="whitespace-nowrap text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DashboardListCard({
  emptyText,
  rows,
  title,
}: {
  emptyText: string;
  rows: Array<{
    badge?: string;
    badgeTone?: "green" | "orange" | "red" | "slate";
    date: string;
    title: string;
  }>;
  title: string;
}) {
  return (
    <div className="flex h-[14.653vw] min-h-[211px] max-h-[281px] min-w-0 flex-1 flex-col gap-[var(--figma-12)] rounded-[8px] border border-[#6D7A8A] p-[var(--figma-22)]">
      <div className="flex w-full items-center gap-[var(--figma-8)] px-[var(--figma-6)] py-[var(--figma-2)] text-[16px] font-medium leading-[1.253]">
        <p className="shrink-0 whitespace-nowrap text-[#6D7A8A]">{title}</p>
        <p className="min-w-0 flex-1 text-right text-[14px] text-[#CAC4BC]">
          더보기+
        </p>
      </div>
      {rows.length > 0 ? (
        <div className="grid">
          {rows.map((row) => (
            <div
              className="flex items-center justify-center gap-[var(--figma-12)] border-b border-[#D9D9D9] px-[var(--figma-12)] py-[var(--figma-6)]"
              key={`${row.title}-${row.date}-${row.badge ?? ""}`}
            >
              <p className="shrink-0 whitespace-nowrap text-[16px] font-medium leading-[1.253] text-[#0D0D0C]">
                {row.title}
              </p>
              {row.badge ? <DashboardTinyBadge label={row.badge} tone={row.badgeTone} /> : null}
              <p className="min-w-0 flex-1 text-right text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
                {row.date}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-center text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
            {emptyText}
          </p>
        </div>
      )}
    </div>
  );
}

function DashboardTinyBadge({
  label,
  tone = "orange",
}: {
  label: string;
  tone?: "green" | "orange" | "red" | "slate";
}) {
  const toneClassName =
    tone === "green"
      ? "bg-[#7A8B52] text-[#F3F3F3]"
      : tone === "red"
        ? "bg-[#C75C36] text-[#FCFCFC]"
        : tone === "slate"
          ? "bg-[#6D7A8A] text-[#F3F3F3]"
          : "bg-[#F7B267] text-[#FCFCFC]";

  return (
    <span
      className={`shrink-0 rounded-[6px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function BasicPanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  const applicationMethod = getBasicApplicationMethod(draft.applyUrl);
  const priceMode = getPriceMode(draft.fee);

  return (
    <section className="bg-white">
      <div className="flex w-[64.236vw] max-w-[1233px] flex-col gap-[var(--figma-32)]">
        <SettingsFormBlock className="min-h-[var(--figma-113)]">
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>프로그램 명</SettingsFieldLabel>
            <FigmaTextInput
              onChange={(title) => updateDraft({ title })}
              placeholder="프로그램 이름을 입력해주세요."
              value={draft.title}
            />
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock className="min-h-[var(--figma-262)]">
          <div className="flex w-full flex-col gap-[var(--figma-44)]">
            <div className="flex w-full flex-col gap-[var(--figma-14)]">
              <div className="flex flex-col gap-[var(--figma-12)]">
                <SettingsFieldLabel>프로그램 운영기간</SettingsFieldLabel>
                <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                  1일 프로그램 이라면 시작일과 종료일을 동일하게 선택해 주세요.
                </p>
              </div>
              <DateRangeInputs
                endLabel="종료일"
                endValue={draft.activityEnd}
                onEndChange={(activityEnd) => updateDraft({ activityEnd })}
                onStartChange={(activityStart) => updateDraft({ activityStart })}
                startLabel="시작일"
                startValue={draft.activityStart}
              />
            </div>

            <div className="flex w-full flex-col gap-[var(--figma-14)]">
              <SettingsFieldLabel>모집기간</SettingsFieldLabel>
              <DateRangeInputs
                endLabel="종료일"
                endValue={draft.recruitEnd}
                onEndChange={(recruitEnd) => updateDraft({ recruitEnd })}
                onStartChange={(recruitStart) => updateDraft({ recruitStart })}
                startLabel="시작일"
                startValue={draft.recruitStart}
              />
            </div>
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock className="min-h-[var(--figma-113)]">
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>모집인원</SettingsFieldLabel>
            <div className="flex items-center gap-[var(--figma-8)]">
              <FigmaTextInput
                className="w-[21.944vw] max-w-[421px]"
                inputMode="numeric"
                onChange={(capacity) =>
                  updateDraft({ capacity: toUnitDraftValue(capacity, "명") })
                }
                placeholder="00."
                value={getUnitInputValue(draft.capacity, "명")}
              />
              <span className="text-[length:var(--figma-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                명
              </span>
            </div>
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock className="min-h-[var(--figma-256)]">
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>신청방법</SettingsFieldLabel>
            <div className="flex flex-col gap-[var(--figma-6)]">
              <BasicRadioOption
                checked={applicationMethod === "open"}
                description="신청 즉시 입금안내가 발송돼요. 입금 순으로 마감이 됩니다."
                label="자유 신청"
                onClick={() => updateDraft({ applyUrl: buildInternalApplyUrl(draft) })}
              />
              <BasicRadioOption
                checked={applicationMethod === "lottery"}
                description={
                  <>
                    추첨 후 선정된 인원에게 입금 안내가 발송돼요.
                    <br />
                    결원 발생 시 추가 모집 또는 추가 안내가 가능해요.
                  </>
                }
                label="추첨 신청"
                onClick={() => updateDraft({ applyUrl: lotteryApplicationApplyUrl })}
              />
              <BasicRadioOption
                checked={applicationMethod === "host"}
                description={
                  <>
                    면접 후 선정된 인원에게 입금 안내가 발송돼요.
                    <br />
                    결원 발생 시 추가 모집 또는 추가 안내가 가능해요.
                  </>
                }
                label="호스트 신청"
                onClick={() => updateDraft({ applyUrl: hostScreeningApplyUrl })}
              />
            </div>
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock className="min-h-[var(--figma-193)]">
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>프로그램 비용</SettingsFieldLabel>
            <div className="flex flex-col gap-[var(--figma-6)]">
              <BasicRadioOption
                checked={priceMode === "free"}
                label="무료"
                onClick={() => updateDraft({ fee: "무료" })}
              />
              <BasicRadioOption
                checked={priceMode === "paid"}
                label="유료"
                onClick={() =>
                  updateDraft({ fee: priceMode === "paid" ? draft.fee : "" })
                }
              >
                <div className="flex w-full items-center gap-[var(--figma-8)] pl-[var(--figma-24)]">
                  <FigmaTextInput
                    className="w-[21.944vw] max-w-[421px]"
                    inputMode="numeric"
                    onChange={(fee) =>
                      updateDraft({ fee: toUnitDraftValue(fee, "원") })
                    }
                    placeholder="00."
                    value={priceMode === "paid" ? getUnitInputValue(draft.fee, "원") : ""}
                  />
                  <span className="text-[length:var(--figma-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                    원
                  </span>
                </div>
              </BasicRadioOption>
              <BasicRadioOption
                checked={priceMode === "undecided"}
                label="미정"
                onClick={() => updateDraft({ fee: "미정" })}
              />
            </div>
          </div>
        </SettingsFormBlock>
      </div>
    </section>
  );
}

function SettingsFormBlock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full items-start justify-end border-b border-[#6D7A8A] px-[1.528vw] py-[1.667vw] ${className}`}
    >
      <div className="w-full">{children}</div>
    </div>
  );
}

function SettingsFieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[length:var(--figma-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
      {children}
    </p>
  );
}

function FigmaTextInput({
  className = "w-full",
  inputMode,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <input
      className={`h-[var(--figma-31)] rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E] ${className}`}
      inputMode={inputMode}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{ fontSize: "var(--figma-12)" }}
      type="text"
      value={value}
    />
  );
}

function DateRangeInputs({
  endLabel,
  endValue,
  onEndChange,
  onStartChange,
  startLabel,
  startValue,
}: {
  endLabel: string;
  endValue: string;
  onEndChange: (value: string) => void;
  onStartChange: (value: string) => void;
  startLabel: string;
  startValue: string;
}) {
  return (
    <div className="flex items-center gap-[var(--figma-21)]">
      <DateInputBox
        label={startLabel}
        onChange={onStartChange}
        value={startValue}
      />
      <span className="h-px w-[var(--figma-22)] bg-[#6D7A8A]" />
      <DateInputBox label={endLabel} onChange={onEndChange} value={endValue} />
    </div>
  );
}

function DateInputBox({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const normalizedValue = normalizeDateInput(value);
  const pickerValue = /^\d{4}-\d{2}-\d{2}$/u.test(normalizedValue)
    ? normalizedValue
    : "";

  function openNativeDatePicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.click();
  }

  return (
    <label className="relative block w-[17.708vw] max-w-[340px]">
      <span className="sr-only">{label}</span>
      <input
        className="h-[var(--figma-31)] w-full rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] pr-[var(--figma-32)] text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
        inputMode="numeric"
        onChange={(event) => onChange(normalizeDateInput(event.target.value))}
        placeholder={label}
        style={{ fontSize: "var(--figma-12)" }}
        type="text"
        value={normalizedValue}
      />
      <button
        aria-label={`${label} 선택`}
        className="absolute right-[var(--figma-10)] top-1/2 grid size-[var(--figma-14)] -translate-y-1/2 place-items-center text-[#0D0D0C]"
        onClick={openNativeDatePicker}
        type="button"
      >
        <CalendarDays aria-hidden="true" className="size-[var(--figma-14)]" strokeWidth={2} />
      </button>
      <input
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[1px] w-[1px] opacity-0"
        onChange={(event) => onChange(normalizeDateInput(event.target.value))}
        ref={pickerRef}
        tabIndex={-1}
        type="date"
        value={pickerValue}
      />
    </label>
  );
}

function BasicRadioOption({
  checked,
  children,
  description,
  label,
  onClick,
}: {
  checked: boolean;
  children?: ReactNode;
  description?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-[var(--figma-6)]">
      <button
        className="flex w-fit items-center gap-[var(--figma-6)] px-[var(--figma-6)] text-left"
        onClick={onClick}
        type="button"
      >
        <span
          aria-hidden="true"
          className={`grid size-[var(--figma-14)] place-items-center rounded-full border ${
            checked ? "border-[#FE701E]" : "border-[#6D7A8A]"
          }`}
        >
          {checked ? (
            <span className="size-[var(--figma-7)] rounded-full bg-[#FE701E]" />
          ) : null}
        </span>
        <span className="text-[length:var(--figma-14)] font-medium leading-[1.253] text-[#0D0D0C]">
          {label}
        </span>
      </button>
      {description ? (
        <p className="pl-[var(--figma-23)] text-[length:var(--figma-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function DetailPanel({
  draft,
  updatedAt,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updatedAt: string;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  const detailImages = draft.detailImages ?? [];

  return (
    <section className="flex w-full max-w-[1563px] items-start gap-[1.706%] bg-white max-lg:flex-col max-lg:gap-[1.389vw]">
      <div className="w-[50.852%] max-w-[795px] shrink-0 max-lg:w-full max-lg:max-w-none">
        <div className="flex h-[var(--figma-96)] items-start justify-end pt-[var(--figma-44)] text-[length:var(--figma-16)] font-normal leading-[1.253] text-[#6D7A8A]">
          최근 수정일 : {formatDateTime(updatedAt)}
        </div>

        <div className="flex flex-col gap-[2.222vw]">
          <DetailFormBlock>
            <div className="flex w-full flex-col gap-[var(--figma-14)]">
              <SettingsFieldLabel>카테고리 선택</SettingsFieldLabel>
              <DetailCategorySelect
                onChange={(theme) => updateDraft({ theme })}
                value={draft.theme}
              />
            </div>
          </DetailFormBlock>

          <DetailFormBlock className="min-h-[27.083vw] max-h-[520px]">
            <div className="flex w-full flex-col">
              <div className="flex flex-col gap-[var(--figma-14)]">
                <SettingsFieldLabel>프로그램 사진</SettingsFieldLabel>
                <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                  JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드 할 수 있어요
                </p>
              </div>

              <div className="mt-[2.778vw] flex items-start gap-[3.056vw]">
                <DetailImageUploadSlot
                  heightClass="h-[var(--figma-152)]"
                  image={draft.image}
                  label="썸네일"
                  onChange={(image) => updateDraft({ image })}
                  programId={draft.id}
                  usage="thumbnail"
                  widthClass="w-[8.472vw] max-w-[163px]"
                />
                <DetailImageUploadSlot
                  heightClass="h-[var(--figma-152)]"
                  images={detailImages}
                  label="메인 슬라이드 (최대 20장)"
                  multiple
                  onImagesChange={(images) =>
                    updateDraft({ detailImages: uniqueImages(images).slice(0, 20) })
                  }
                  programId={draft.id}
                  usage="detail-gallery"
                  widthClass="w-[28.333vw] max-w-[544px]"
                />
              </div>

              <p className="mt-[3.056vw] text-[length:var(--figma-14)] font-semibold leading-[1.253] text-[#7A8B52]">
                현지의 생생한 모습이 담긴 사진을 올려주세요. 텍스트가 많은 홍보 이미지는 사용을 권장하지 않아요
              </p>
            </div>
          </DetailFormBlock>

          <DetailFormBlock>
            <div className="flex w-full flex-col gap-[var(--figma-14)]">
              <div className="flex flex-col gap-[var(--figma-14)]">
                <SettingsFieldLabel>프로그램 사진</SettingsFieldLabel>
                <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                  썸네일 카드에 표시돼요 (최대 60자)
                </p>
              </div>
              <div className="relative h-[var(--figma-50)]">
                <textarea
                  className="h-[var(--figma-31)] w-full resize-none rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] py-[var(--figma-8)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                  maxLength={60}
                  onChange={(event) => updateDraft({ summary: event.target.value })}
                  placeholder="프로그램을 한눈에 설명하는 짧은 소개글을 작성해 주세요"
                  style={{ fontSize: "var(--figma-12)" }}
                  value={draft.summary}
                />
                <p className="absolute bottom-0 right-0 w-full text-right text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#D9D9D9]">
                  {draft.summary.length} / 60
                </p>
              </div>
            </div>
          </DetailFormBlock>

          <DetailFormBlock className="min-h-[28.056vw] max-h-[539px]">
            <div className="flex w-full flex-col gap-[var(--figma-14)]">
              <div className="flex flex-col gap-[var(--figma-14)]">
                <SettingsFieldLabel>프로그램 상세내용</SettingsFieldLabel>
                <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                  프로그램을 자세히 소개해주세요. 사진과 파일도 추가할 수 있어요
                </p>
              </div>
              <ProgramRichTextEditor
                onChange={(description) => updateDraft({ description })}
                value={draft.description}
              />
            </div>
          </DetailFormBlock>
        </div>
      </div>

      <DetailPreviewRail draft={draft} />
    </section>
  );
}

function DetailFormBlock({
  borderClassName = "border-b border-[#6D7A8A]",
  children,
  className = "",
  paddingClassName = "px-[var(--figma-22)] py-[var(--figma-24)]",
}: {
  borderClassName?: string;
  children: ReactNode;
  className?: string;
  paddingClassName?: string;
}) {
  return (
    <section
      className={`flex w-full ${borderClassName} ${paddingClassName} ${className}`}
    >
      {children}
    </section>
  );
}

function DetailCategorySelect({
  onChange,
  value,
}: {
  onChange: (value: ThemeKey) => void;
  value: ThemeKey;
}) {
  return (
    <select
      className="h-[var(--figma-35)] w-full rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] text-[#0D0D0C] outline-none focus:border-[#FE701E]"
      onChange={(event) => onChange(event.target.value as ThemeKey)}
      style={{ fontSize: "var(--figma-12)" }}
      value={value}
    >
      <option value="">카테고리는 선택해주세요</option>
      {themeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DetailImageUploadSlot({
  heightClass,
  image = "",
  images = [],
  label,
  multiple = false,
  onChange,
  onImagesChange,
  programId,
  usage,
  widthClass,
}: {
  heightClass: string;
  image?: string;
  images?: string[];
  label: string;
  multiple?: boolean;
  onChange?: (image: string) => void;
  onImagesChange?: (images: string[]) => void;
  programId: string;
  usage: string;
  widthClass: string;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewImage = image || images[0] || "";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError("");
    setUploading(true);

    try {
      const targets = multiple ? files.slice(0, Math.max(1, 20 - images.length)) : [files[0]];
      const uploadedImages = await Promise.all(
        targets.map((file) => uploadProgramImage(file, programId, usage)),
      );

      if (multiple) {
        onImagesChange?.(uniqueImages([...images, ...uploadedImages]).slice(0, 20));
      } else {
        onChange?.(uploadedImages[0] ?? "");
      }

      event.target.value = "";
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "이미지를 업로드하지 못했어요.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`flex shrink-0 flex-col gap-[var(--figma-14)] ${widthClass}`}>
      <p className="text-[length:var(--figma-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        {label}
      </p>
      <label
        className={`grid cursor-pointer place-items-center overflow-hidden rounded-[var(--figma-7)] border border-dashed border-[#D9D9D9] bg-[#F9F9F9] bg-cover bg-center text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#D9D9D9] transition hover:border-[#FE701E] hover:text-[#FE701E] ${heightClass}`}
        style={previewImage ? { backgroundImage: `url("${previewImage}")` } : undefined}
      >
        <span className={previewImage ? "rounded bg-white/85 px-2 py-1" : ""}>
          {uploading ? "업로드 중" : previewImage ? "파일 변경" : "파일 업로드"}
        </span>
        <input
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          multiple={multiple}
          onChange={handleFileChange}
          type="file"
        />
      </label>
      {multiple && images.length > 0 ? (
        <p className="text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          {images.length} / 20
        </p>
      ) : null}
      {error ? (
        <p className="text-[length:var(--figma-12)] font-semibold leading-[1.253] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProgramRichTextEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const editor = useEditor({
    content: normalizeEditorHtml(value),
    editorProps: {
      attributes: {
        class:
          "min-h-[13.889vw] max-h-[267px] overflow-y-auto px-[var(--figma-12)] py-[var(--figma-12)] text-[#0D0D0C] outline-none",
        style: "font-size: var(--figma-12); line-height: 1.6;",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      UnderlineExtension,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = normalizeEditorHtml(value);
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent);
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-white">
      <ProgramRichTextToolbar editor={editor} />
      <EditorContent className="program-rich-text-editor" editor={editor} />
    </div>
  );
}

function ProgramRichTextToolbar({ editor }: { editor: Editor | null }) {
  return (
    <div className="flex flex-wrap items-center gap-[var(--figma-6)] border-b border-[#F7B267] px-[var(--figma-8)] py-[var(--figma-6)]">
      <RichToolbarButton
        active={Boolean(editor?.isActive("bold"))}
        disabled={!editor}
        icon={<Bold size={14} />}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        title="굵게"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("italic"))}
        disabled={!editor}
        icon={<Italic size={14} />}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        title="기울임"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("underline"))}
        disabled={!editor}
        icon={<Underline size={14} />}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        title="밑줄"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("heading", { level: 1 }))}
        disabled={!editor}
        icon={<Heading1 size={14} />}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        title="큰 제목"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("heading", { level: 2 }))}
        disabled={!editor}
        icon={<Heading2 size={14} />}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        title="중간 제목"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("bulletList"))}
        disabled={!editor}
        icon={<List size={14} />}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        title="글머리 목록"
      />
      <RichToolbarButton
        active={Boolean(editor?.isActive("orderedList"))}
        disabled={!editor}
        icon={<ListOrdered size={14} />}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      />
      <RichToolbarButton
        disabled={!editor}
        icon={<Undo2 size={14} />}
        onClick={() => editor?.chain().focus().undo().run()}
        title="되돌리기"
      />
      <RichToolbarButton
        disabled={!editor}
        icon={<Redo2 size={14} />}
        onClick={() => editor?.chain().focus().redo().run()}
        title="다시 실행"
      />
    </div>
  );
}

function RichToolbarButton({
  active = false,
  disabled = false,
  icon,
  onClick,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={title}
      className={`grid size-[var(--figma-28)] place-items-center rounded-[4px] border text-[#5B3A29] transition disabled:opacity-40 ${
        active
          ? "border-[#FE701E] bg-[#FFF6EC] text-[#FE701E]"
          : "border-[#E6D6CA] bg-white hover:border-[#FE701E] hover:text-[#FE701E]"
      }`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {icon}
    </button>
  );
}

function DetailPreviewRail({
  draft,
  thumbnailInitiallyCollapsed = false,
}: {
  draft: HostProgramDraft;
  thumbnailInitiallyCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState({
    detail: false,
    thumbnail: thumbnailInitiallyCollapsed,
  });
  const previewProgram = useMemo(() => mapHostDraftToPreviewProgram(draft), [draft]);

  return (
    <aside className="min-h-[120.962vw] w-[47.442%] max-w-[741px] shrink-0 border-l border-[#6D7A8A] bg-white max-lg:w-full max-lg:max-w-none">
      <p className="pt-[var(--figma-63)] text-center text-[length:var(--figma-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        미리보기
      </p>
      <div className="mt-[var(--figma-24)] grid gap-[1.667vw] px-[0.764vw]">
        <PreviewFrame
          collapsed={collapsed.thumbnail}
          onToggle={() =>
            setCollapsed((current) => ({
              ...current,
              thumbnail: !current.thumbnail,
            }))
          }
          title="썸네일 카드"
        >
          <ThumbnailPreviewContent program={previewProgram} />
        </PreviewFrame>
        <PreviewFrame
          collapsed={collapsed.detail}
          onToggle={() =>
            setCollapsed((current) => ({
              ...current,
              detail: !current.detail,
            }))
          }
          title="상세 페이지"
        >
          <DetailPagePreviewContent program={previewProgram} />
        </PreviewFrame>
      </div>
    </aside>
  );
}

function PreviewFrame({
  children,
  collapsed,
  onToggle,
  title,
}: {
  children: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  title: string;
}) {
  const toggleIcon = collapsed ? nuvioIcons.dropdown : nuvioIcons.dropup;

  return (
    <section className="min-w-0 rounded-[var(--figma-7)] border border-[#6D7A8A] bg-[#F9F9F9] p-[1.389vw]">
      <div className="flex h-[var(--figma-30)] items-start justify-between gap-[var(--figma-14)]">
        <span className="rounded-full bg-[#FF9A3D] px-[var(--figma-14)] py-[var(--figma-6)] text-[length:var(--figma-12)] font-bold leading-[1.253] text-[#F9F9F9]">
          {title}
        </span>
        <button
          aria-label={`${title} ${collapsed ? "펼치기" : "접기"}`}
          className="grid size-[var(--figma-21)] place-items-center border-0 bg-transparent p-0"
          onClick={onToggle}
          type="button"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-full"
            height={21}
            src={toggleIcon}
            width={21}
          />
        </button>
      </div>
      {collapsed ? null : (
        <div className="mt-[var(--figma-14)] min-w-0 overflow-hidden">
          {children}
        </div>
      )}
    </section>
  );
}

function ThumbnailPreviewContent({ program }: { program: Program }) {
  const deadline = getDday(program.recruitEnd, program.status);
  const location = [program.region, program.city].filter(Boolean).join(" ");
  const summary = getProgramIntroParagraphs(program, 1)[0] ?? program.summary;
  const mainImageStyle = program.image
    ? { backgroundImage: `url("${escapeCssUrl(program.image)}")` }
    : undefined;

  return (
    <div className="flex min-h-[var(--figma-262)] items-center justify-center gap-[var(--figma-20)] px-[var(--figma-12)] py-[var(--figma-14)]">
      <article className="w-[var(--figma-193)] overflow-hidden">
        <div
          aria-label={`${program.title} 썸네일 이미지`}
          className="h-[var(--figma-185)] w-full overflow-hidden rounded-[6px] bg-[#D9D9D9] bg-cover bg-center shadow-sm ring-1 ring-[#E6D6CA]"
          role="img"
          style={mainImageStyle}
        />
        <div className="mt-[10px] flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-[10px] font-bold leading-[1.25] text-[#2B1E17]">
            {program.title}
          </h3>
          <strong className="shrink-0 text-[10px] font-bold leading-[1.25] text-[#2B1E17]">
            {deadline}
          </strong>
        </div>
        <div className="preview-thumbnail-meta mt-[var(--figma-8)] grid gap-[var(--figma-4)] font-medium text-[#6D7A8A]">
          <PreviewMetaLine icon={nuvioIcons.place} text={program.sourceName} />
          <PreviewMetaLine icon={nuvioIcons.map} text={location} />
          <PreviewMetaLine
            icon={nuvioIcons.calendar}
            text={`~${formatProgramKoreanDate(program.recruitEnd)}`}
          />
        </div>
      </article>

      <article className="w-[7.222vw] min-w-[104px] max-w-[139px] overflow-hidden opacity-90">
        <div
          aria-label={`${program.title} 작은 썸네일 이미지`}
          className="aspect-[0.81] w-full overflow-hidden rounded-[5px] bg-[#D9D9D9] bg-cover bg-center shadow-sm ring-1 ring-[#E6D6CA]"
          role="img"
          style={mainImageStyle}
        />
        <p className="preview-thumbnail-small-copy mt-[var(--figma-8)] truncate font-normal text-[#6D7A8A]">
          {location || "프로그램 지역 위치"}
        </p>
        <h4 className="preview-thumbnail-small-title mt-[5px] line-clamp-2 font-medium text-[#5B3A29]">
          {program.title}
        </h4>
        <p className="preview-thumbnail-small-copy mt-[var(--figma-6)] line-clamp-3 font-normal text-[#C9C4BD]">
          {summary}
        </p>
        <p className="preview-thumbnail-small-copy mt-[var(--figma-8)] truncate font-normal text-[#6D7A8A]">
          {program.sourceName}
        </p>
      </article>
    </div>
  );
}

function PreviewMetaLine({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-[5px]">
      <Image
        alt=""
        aria-hidden="true"
        className="size-[9px] shrink-0 opacity-75"
        height={9}
        src={icon}
        width={9}
      />
      <span className="truncate">{text}</span>
    </span>
  );
}

function DetailPagePreviewContent({ program }: { program: Program }) {
  const [scaleContainerRef, previewScale] = usePreviewCanvasScale(
    detailPreviewCanvasWidth,
  );
  const scaledCanvasHeight = Math.ceil(detailPreviewCanvasHeight * previewScale);
  const scaledCanvasWidth = Math.ceil(detailPreviewCanvasWidth * previewScale);
  const galleryImages = getProgramGalleryImages(program);
  const introImage = galleryImages[0] ?? "";
  const introParagraphs = getProgramIntroParagraphs(program);
  const scheduleCards = getProgramScheduleItems(program, galleryImages).slice(0, 3);
  const placeDetails = getProgramPlaceDetails(program);
  const guideDetails = getProgramGuideDetails(program);

  return (
    <div
      data-preview-scroll-viewport="detail-page"
      className="min-w-0 max-w-full overflow-y-auto overflow-x-hidden bg-white text-[#2B1E17] [scrollbar-width:thin]"
      ref={scaleContainerRef}
      style={{ height: detailPreviewViewportHeight }}
    >
      <div style={{ height: scaledCanvasHeight, width: scaledCanvasWidth }}>
        <div
          data-preview-canvas="detail-page"
          className="origin-top-left bg-white"
          style={{
            height: detailPreviewCanvasHeight,
            transform: `scale(${previewScale})`,
            width: detailPreviewCanvasWidth,
          }}
        >
        <div className="flex h-[56px] items-center border-b border-[#F5E1D3] bg-white px-[30px]">
          <Image
            alt="누비오"
            className="h-[30px] w-[85px]"
            height={30}
            src="/brand/nuvio-wordmark.svg"
            width={85}
          />
          <div className="ml-auto flex items-center gap-[34px] text-[12px] font-medium text-[#5B3A29]">
            <span className="rounded-full border border-[#FF9A3D] px-[48px] py-[8px] text-[#6D7A8A]">
              어디로 떠날까요?
            </span>
            <span>매거진</span>
            <span>채널</span>
            <span className="h-[18px] w-px bg-[#F5B16F]" />
            <Image alt="" height={20} src={nuvioIcons.bell} width={20} />
            <Image alt="" height={20} src={nuvioIcons.user} width={20} />
          </div>
        </div>

        <div
          className="h-[436px] bg-[#778695] bg-cover bg-center"
          style={
            introImage
              ? { backgroundImage: `url("${escapeCssUrl(introImage)}")` }
              : undefined
          }
        />

        <div className="mx-auto grid w-[1031px] grid-cols-[692px_297px] gap-[42px] pt-[40px]">
          <article className="min-w-0">
            <div className="flex items-start justify-between pb-[6px]">
              <div className="w-[420px]">
                <h2 className="truncate text-[20px] font-semibold leading-[1.253] text-[#5B3A29]">
                  {program.title}
                </h2>
                <p className="mt-[8px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
                  {[program.region, program.city].filter(Boolean).join(", ")}
                </p>
                <span className="mt-[8px] inline-flex rounded-md bg-[#F7B267] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] text-[#FCFCFC]">
                  {program.badges[0] ?? "자유신청"}
                </span>
              </div>
            </div>

            <nav className="mt-[8px] flex h-[33px] items-center gap-[21px] border-y border-[#F5E1D3] pt-[6px] text-[12px] leading-[1.6]">
              <span className="relative h-[27px] font-semibold text-[#5B3A29] after:absolute after:bottom-[-1px] after:left-0 after:h-[2px] after:w-full after:bg-[#FE701E]">
                여행 소개
              </span>
              <span className="h-[27px] text-[#CAC4BC]">일정 안내</span>
              {launchFeatureFlags.reviews ? (
                <span className="h-[27px] text-[#CAC4BC]">후기</span>
              ) : null}
              <span className="h-[27px] text-[#CAC4BC]">집결지 정보</span>
              <span className="h-[27px] text-[#CAC4BC]">안내사항</span>
            </nav>

            <section className="relative mt-[16px] h-[620px] overflow-hidden bg-[#D9D9D9] bg-cover bg-center">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={
                  introImage
                    ? { backgroundImage: `url("${escapeCssUrl(introImage)}")` }
                    : undefined
                }
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 grid gap-[8px] p-[26px] text-[14px] font-medium leading-[1.7] text-white">
                {introParagraphs.map((paragraph, index) => (
                  <p className="line-clamp-2 break-keep" key={`${paragraph}-${index}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <DesktopPreviewSection title="여행 일정">
              <div className="grid gap-[18px]">
                {scheduleCards.map((item, index) => (
                  <article
                    className="grid h-[200px] grid-cols-[310px_minmax(0,1fr)] overflow-hidden rounded-md border border-[#F3F3F3] bg-white"
                    key={`${item.day}-${index}`}
                  >
                    <div
                      className="bg-[#7A8B52] bg-cover bg-center"
                      style={
                        item.image
                          ? { backgroundImage: `url("${escapeCssUrl(item.image)}")` }
                          : undefined
                      }
                    />
                    <div className="min-w-0 p-[14px]">
                      <h4 className="text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
                        {item.day}
                      </h4>
                      <p className="mt-[13px] line-clamp-3 max-w-[359px] break-keep text-[12px] font-medium leading-[1.46] text-[#6D7A8A]">
                        {item.body}
                      </p>
                      <p className="mt-[13px] text-[12px] font-normal leading-[1.6] text-[#FE701E]">
                        일정 보기
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </DesktopPreviewSection>

            <DesktopPreviewSection title="집결지 정보">
              <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-[20px] gap-y-[16px] px-[12px] text-[14px] leading-[1.55]">
                <dt className="font-semibold text-[#5B3A29]">집결지</dt>
                <dd className="break-keep text-[#6D7A8A]">{placeDetails.meetingAddress}</dd>
                <dt className="font-semibold text-[#5B3A29]">주차 안내</dt>
                <dd className="break-keep text-[#6D7A8A]">{placeDetails.parkingGuide}</dd>
                <dt className="font-semibold text-[#5B3A29]">이동수단</dt>
                <dd className="break-keep text-[#6D7A8A]">{placeDetails.transportGuide}</dd>
              </dl>
            </DesktopPreviewSection>

            <DesktopPreviewSection title="안내사항">
              {[
                ["신청안내", [guideDetails.applicationGuide]],
                ["포함사항", guideDetails.includedItems],
                ["불포함사항", guideDetails.excludedItems],
                ["준비물", guideDetails.preparationItems],
                ["환불규정", guideDetails.refundRules],
              ].map(([label, values]) => (
                <div
                  className="grid min-h-[52px] grid-cols-[96px_minmax(0,1fr)] gap-[16px] border-b border-[#F5E1D3] px-[8px] py-[17px] text-[14px]"
                  key={label as string}
                >
                  <strong className="font-normal leading-[1.253] text-[#5B3A29]">
                    {label as string}
                  </strong>
                  <div className="grid gap-[6px] text-[12px] font-medium leading-[1.65] text-[#6D7A8A]">
                    {(values as string[]).map((value, index) => (
                      <p className="break-keep" key={`${value}-${index}`}>
                        {value}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </DesktopPreviewSection>
          </article>

          <aside className="sticky top-[86px] min-w-0">
            <section className="min-h-[333px] rounded-md border border-[#F5E1D3] bg-[#FCFCFC] p-[16px] text-[12px]">
              <div className="grid min-h-[35px] grid-cols-2 rounded-[7px] border border-[#F5E1D3] text-center leading-[1.6] text-[#6D7A8A]">
                <span className="p-[8px]">
                  일정 {formatCompactDateRange(program.activityStart, program.activityEnd)}
                </span>
                <span className="border-l border-[#F5E1D3] p-[8px]">
                  모집 {program.capacity}
                </span>
              </div>
              <p className="mt-[8px] text-right leading-[1.6] text-[#6D7A8A]">
                ~{formatProgramKoreanDate(program.recruitEnd)}
              </p>
              <div className="mt-[8px] flex items-center justify-between">
                <span className="font-medium text-[#F7B267]">자유신청</span>
                <strong className="font-semibold text-[#7A8B52]">D-20</strong>
              </div>
              <h3 className="mt-[8px] line-clamp-2 text-[16px] font-medium leading-[1.253] text-[#5B3A29]">
                {program.title}
              </h3>
              <p className="mt-[12px] text-[16px] font-medium leading-[1.253] text-[#5B3A29]">
                {program.fee}
                <span className="pl-[4px] text-[12px] font-normal text-[#CAC4BC]">/명</span>
              </p>
              <div className="mt-[14px] rounded-[5px] bg-[#F3F3F3] p-[6px] leading-[1.6] text-[#6D7A8A]">
                <div className="flex items-center justify-between">
                  <span>신청 인원</span>
                  <span>00</span>
                </div>
                <div className="mt-[6px] flex items-center justify-between border-t border-[#F5E1D3] pt-[6px] text-[16px] text-[#5B3A29]">
                  <strong>총액</strong>
                  <strong>{program.fee}</strong>
                </div>
              </div>
              <div className="mt-[8px] grid h-[29px] place-items-center rounded bg-[#FE701E] font-medium text-[#FFF6EC]">
                신청하기
              </div>
            </section>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}

const detailPreviewCanvasWidth = 1440;
const detailPreviewCanvasHeight = 2800;
const detailPreviewViewportHeight = "clamp(760px, 58vw, 1012px)";

function usePreviewCanvasScale(baseWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.48);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const width = container.clientWidth;
      setScale(width > 0 ? Math.min(1, width / baseWidth) : 0.48);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [baseWidth]);

  return [containerRef, scale] as const;
}

function DesktopPreviewSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="mt-[40px]">
      <div className="flex h-[20px] items-center gap-[8px]">
        <h3 className="shrink-0 whitespace-nowrap text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
          {title}
        </h3>
        <span aria-hidden="true" className="h-px min-w-px flex-1 bg-[#F5E1D3]" />
      </div>
      <div className="mt-[18px]">{children}</div>
    </section>
  );
}

function mapHostDraftToPreviewProgram(draft: HostProgramDraft): Program {
  const image = draft.image.trim();
  const rawHashtags = Array.isArray(draft.hashtags) ? draft.hashtags : [];
  const rawItineraryDays = Array.isArray(draft.itineraryDays)
    ? draft.itineraryDays
    : [];
  const rawDetailImages = Array.isArray(draft.detailImages)
    ? draft.detailImages
    : [];
  const hashtags = rawHashtags
    .map((tag) => tag.trim().replace(/^#/u, ""))
    .filter(Boolean);
  const itineraryImages = uniqueImages(
    rawItineraryDays.flatMap((day) => [
      day.image,
      ...(Array.isArray(day.images) ? day.images : []),
    ]),
  );
  const body = [draft.description.trim() || draft.summary.trim()].filter(Boolean);

  return {
    activityEnd: draft.activityEnd,
    activityStart: draft.activityStart,
    announcement: `${draft.recruitEnd} 모집 마감`,
    applicants: 0,
    applyUrl: draft.applyUrl.trim() || "https://www.nuvio.kr/apply",
    badges: hashtags.slice(0, 4),
    body,
    capacity: draft.capacity.trim() || "모집 인원",
    categories: [draft.theme],
    city: draft.city.trim() || "입력하기",
    description: draft.description.trim() || draft.summary.trim(),
    fee: draft.fee.trim() || "무료",
    gallery: uniqueImages([image, ...rawDetailImages, ...itineraryImages]),
    guideInfo: draft.guideInfo,
    hashtags,
    id: draft.id,
    image,
    itineraryDays: rawItineraryDays,
    periodKey: draft.periodKey,
    phone: draft.phone.trim() || "000-0000-0000",
    contactEmail: (draft.contactEmail ?? "").trim() || undefined,
    placeInfo: draft.placeInfo,
    recruitEnd: draft.recruitEnd,
    recruitStart: draft.recruitStart,
    region: draft.region.trim() || "지역",
    slug: draft.slug || draft.id,
    sourceName: draft.sourceName.trim() || "누비오 Host",
    sourceUrl: draft.sourceUrl.trim() || "https://www.nuvio.kr",
    status: draft.status,
    subsidyAmount: draft.subsidyAmount,
    subsidyLabel: draft.subsidyLabel.trim() || "지원 혜택 협의",
    summary:
      stripHtml(draft.summary || draft.description).trim() ||
      "프로그램 소개를 입력해주세요.",
    target: draft.target.trim() || "참여 대상",
    theme: draft.theme,
    title: draft.title.trim() || "여행 프로그램 이름 입력",
  };
}

function normalizeEditorHtml(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "<p></p>";
  if (/<[a-z][\s\S]*>/iu.test(trimmedValue)) return trimmedValue;
  return `<p>${escapeHtml(trimmedValue).replace(/\n/gu, "<br>")}</p>`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function SchedulePanel({
  draft,
  updatedAt,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updatedAt: string;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  const itineraryDayIds = useMemo(
    () => draft.itineraryDays.map((day) => day.id),
    [draft.itineraryDays],
  );
  const [expandedDayIds, setExpandedDayIds] = useState<Set<string>>(
    () => new Set(itineraryDayIds[0] ? [itineraryDayIds[0]] : []),
  );
  const renderedExpandedDayIds = useMemo(() => {
    const validIds = new Set(itineraryDayIds);
    const next = new Set([...expandedDayIds].filter((id) => validIds.has(id)));
    if (next.size === 0 && itineraryDayIds[0]) next.add(itineraryDayIds[0]);
    return next;
  }, [expandedDayIds, itineraryDayIds]);

  function updateItineraryDay(
    dayId: string,
    patch: Partial<HostProgramItineraryDay>,
  ) {
    updateDraft({
      itineraryDays: draft.itineraryDays.map((day) =>
        day.id === dayId ? { ...day, ...patch } : day,
      ),
    });
  }

  function addItineraryDay() {
    const nextDay = createHostProgramItineraryDay(draft.itineraryDays.length + 1);
    updateDraft({
      itineraryDays: [...draft.itineraryDays, nextDay],
    });
    setExpandedDayIds((current) => new Set([...current, nextDay.id]));
  }

  function toggleItineraryDay(dayId: string) {
    setExpandedDayIds((current) => {
      const next = new Set(current);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  }

  return (
    <SettingsPreviewLayout draft={draft} updatedAt={updatedAt}>
      <div className="flex flex-col gap-[var(--figma-26)]">
        {draft.itineraryDays.map((day, index) => (
          <ScheduleDayFigmaEditor
            day={day}
            dayNumber={index + 1}
            expanded={renderedExpandedDayIds.has(day.id)}
            key={day.id}
            onChange={(patch) => updateItineraryDay(day.id, patch)}
            onToggle={() => toggleItineraryDay(day.id)}
            programId={draft.id}
          />
        ))}
        <div className="flex flex-col items-center gap-[var(--figma-8)] pb-[var(--figma-8)]">
          <p className="text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#6D7A8A]">
            아래의 버튼을 눌러 일정을 추가해 주세요
          </p>
          <button
            aria-label="일정 추가"
            className="grid size-[var(--figma-21)] place-items-center rounded-full bg-[#6D7A8A] text-white transition hover:bg-[#5D6876]"
            onClick={addItineraryDay}
            type="button"
          >
            <Plus aria-hidden="true" className="size-[var(--figma-12)]" strokeWidth={3} />
          </button>
        </div>
      </div>
    </SettingsPreviewLayout>
  );
}

function SettingsPreviewLayout({
  children,
  draft,
  updatedAt,
}: {
  children: ReactNode;
  draft: HostProgramDraft;
  updatedAt: string;
}) {
  return (
    <section className="flex w-full max-w-[1563px] items-start gap-[1.706%] bg-white max-lg:flex-col max-lg:gap-[1.389vw]">
      <div className="w-[50.852%] max-w-[795px] shrink-0 max-lg:w-full max-lg:max-w-none">
        <div className="flex h-[6.667vw] max-h-[128px] items-start justify-end pt-[3.056vw] text-[length:var(--figma-16)] font-normal leading-[1.253] text-[#6D7A8A]">
          최근 수정일 : {formatDateTime(updatedAt)}
        </div>
        {children}
      </div>
      <DetailPreviewRail draft={draft} thumbnailInitiallyCollapsed />
    </section>
  );
}

function ScheduleDayFigmaEditor({
  day,
  dayNumber,
  expanded,
  onChange,
  onToggle,
  programId,
}: {
  day: HostProgramItineraryDay;
  dayNumber: number;
  expanded: boolean;
  onChange: (patch: Partial<HostProgramItineraryDay>) => void;
  onToggle: () => void;
  programId: string;
}) {
  const parsedTimetableRows = useMemo(
    () => parseTimetableRows(day.timetable),
    [day.timetable],
  );
  const [visibleTimetableRowCount, setVisibleTimetableRowCount] = useState(
    Math.max(1, parsedTimetableRows.length),
  );
  const renderedTimetableRowCount = Math.max(
    visibleTimetableRowCount,
    parsedTimetableRows.length,
    1,
  );
  const timetableRows = useMemo(() => {
    const rows = [...parsedTimetableRows];
    while (rows.length < renderedTimetableRowCount) {
      rows.push({ text: "", time: "" });
    }
    return rows.slice(0, 8);
  }, [parsedTimetableRows, renderedTimetableRowCount]);
  const timeTableCount = countFilledTimetableRows(timetableRows);

  function updateTimetableRows(nextRows: ScheduleTimetableRow[]) {
    setVisibleTimetableRowCount(Math.max(1, Math.min(8, nextRows.length)));
    onChange({ timetable: serializeTimetableRows(nextRows) });
  }

  function updateTimetableRow(index: number, patch: Partial<ScheduleTimetableRow>) {
    const nextRows = timetableRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    updateTimetableRows(nextRows);
  }

  function addTimetableRow() {
    if (timetableRows.length >= 8) return;
    setVisibleTimetableRowCount((current) => Math.min(8, current + 1));
  }

  function removeTimetableRow(index: number) {
    const nextRows = timetableRows.filter((_, rowIndex) => rowIndex !== index);
    updateTimetableRows(
      nextRows.length > 0 ? nextRows : [{ text: "", time: "" }],
    );
  }

  const toggleIcon = expanded ? nuvioIcons.dropup : nuvioIcons.dropdown;

  return (
    <DetailFormBlock
      borderClassName={expanded ? "border-b border-[#6D7A8A]" : ""}
      paddingClassName={
        expanded
          ? "px-0 pb-[var(--figma-15)] pt-[var(--figma-6)]"
          : "px-0 pb-0 pt-[var(--figma-6)]"
      }
    >
      <div className="flex w-full flex-col">
        <button
          aria-expanded={expanded}
          className={`flex h-[var(--figma-44)] w-full items-center justify-between bg-[#6D7A8A] px-[var(--figma-12)] text-left text-[#F9F9F9] ${
            expanded
              ? "rounded-tl-[var(--figma-4)] rounded-tr-[var(--figma-4)]"
              : "rounded-[var(--figma-4)]"
          }`}
          onClick={onToggle}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-[var(--figma-14)]">
            <span className="text-[length:var(--figma-16)] font-semibold leading-[1.253]">
              {dayNumber}일차
            </span>
            <span className="truncate text-[length:var(--figma-14)] font-medium leading-[1.253]">
              타임 테이블 ({timeTableCount.toString().padStart(2, "0")}개)
            </span>
          </span>
          <Image
            alt=""
            aria-hidden="true"
            className={`h-[var(--figma-18)] w-[var(--figma-19)] shrink-0 ${
              expanded ? "" : "brightness-0 invert"
            }`}
            height={16}
            src={toggleIcon}
            width={16}
          />
        </button>

        {expanded ? (
          <div className="px-[var(--figma-22)] pt-[var(--figma-12)]">
            <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
              JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
            </p>
            <div className="mt-[var(--figma-12)] px-[var(--figma-8)]">
              <p className="text-[length:var(--figma-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
                활동 사진 (최대 5장)
              </p>
            </div>
            <SchedulePhotoSlots
              day={day}
              onChange={onChange}
              programId={programId}
            />

            <p className="mt-[var(--figma-16)] text-[length:var(--figma-12)] font-semibold leading-[1.253] text-[#7A8B52]">
              해당 일차의 활동이나 장소가 담긴 사진을 올려주세요
            </p>

            <div className="mt-[var(--figma-26)] flex flex-col gap-[var(--figma-10)]">
              <SettingsFieldLabel>일정 소개</SettingsFieldLabel>
              <textarea
                className="h-[var(--figma-31)] resize-none rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-8)] py-[var(--figma-6)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                maxLength={100}
                onChange={(event) => onChange({ summary: event.target.value })}
                placeholder="이날의 여행 컨셉과 체험 내용을 간략히 소개해주세요"
                style={{ fontSize: "var(--figma-12)" }}
                value={day.summary}
              />
              <p className="text-right text-[length:var(--figma-10)] font-normal leading-[1.253] text-[#D9D9D9]">
                {day.summary.length} / 100
              </p>
            </div>

            <div className="mt-[var(--figma-14)] flex flex-col gap-[var(--figma-10)]">
              <SettingsFieldLabel>타임 테이블 (최대8개)</SettingsFieldLabel>
              <div className="grid gap-[var(--figma-6)]">
                {timetableRows.map((row, index) => (
                  <div
                    className="flex items-center pl-[var(--figma-22)]"
                    key={`${index}-${timetableRows.length}`}
                  >
                    <input
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 선택`}
                      className="size-[var(--figma-10)] shrink-0 rounded-[2px] border border-[#AEB8C2] accent-[#FE701E]"
                      type="checkbox"
                    />
                    <input
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 시간`}
                      className="ml-[var(--figma-12)] h-[var(--figma-31)] w-[var(--figma-55)] rounded-[var(--figma-7)] border-[0.5px] border-[#D9D9D9] bg-white px-[var(--figma-4)] text-center text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                      inputMode="numeric"
                      onChange={(event) =>
                        updateTimetableRow(index, {
                          time: normalizeTimetableTimeInput(event.target.value),
                        })
                      }
                      placeholder="00 : 00"
                      value={row.time}
                    />
                    <input
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 내용`}
                      className="ml-[var(--figma-8)] h-[var(--figma-31)] w-[var(--figma-379)] rounded-[var(--figma-7)] border-[0.5px] border-[#D9D9D9] bg-white px-[var(--figma-8)] text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                      onChange={(event) =>
                        updateTimetableRow(index, { text: event.target.value })
                      }
                      placeholder="일정을 간단하게 작성해주세요"
                      value={row.text}
                    />
                    <button
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 삭제`}
                      className="ml-[var(--figma-8)] grid size-[var(--figma-12)] shrink-0 place-items-center rounded-full bg-[#CAC4BC] text-white transition hover:bg-[#AEB8C2] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={timetableRows.length <= 1}
                      onClick={() => removeTimetableRow(index)}
                      type="button"
                    >
                      <Minus aria-hidden="true" className="size-[var(--figma-6)]" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="mx-auto inline-flex items-center gap-[var(--figma-4)] text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#CAC4BC] transition hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={timetableRows.length >= 8}
                onClick={addTimetableRow}
                type="button"
              >
                <span className="grid size-[var(--figma-10)] place-items-center rounded-full bg-[#CAC4BC] text-white">
                  <Plus aria-hidden="true" className="size-[var(--figma-6)]" strokeWidth={3} />
                </span>
                타임테이블 추가
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DetailFormBlock>
  );
}

type ScheduleTimetableRow = {
  text: string;
  time: string;
};

function parseTimetableRows(value: string): ScheduleTimetableRow[] {
  const rows = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const match = line.match(/^(\d{1,2})\s*:\s*(\d{2})(?:\s*(?:\||-|–|\s)\s*(.+))?$/u);
      if (!match) return { text: line, time: "" };

      const hour = match[1].padStart(2, "0");
      return {
        text: match[3] ?? "",
        time: `${hour}:${match[2]}`,
      };
    });

  return rows.length > 0 ? rows : [{ text: "", time: "" }];
}

function serializeTimetableRows(rows: ScheduleTimetableRow[]): string {
  return rows
    .map((row) => ({
      text: row.text.trim(),
      time: row.time.trim(),
    }))
    .filter((row) => row.text || row.time)
    .map((row) => {
      if (row.time && row.text) return `${row.time} ${row.text}`;
      return row.time || row.text;
    })
    .join("\n");
}

function countFilledTimetableRows(rows: ScheduleTimetableRow[]): number {
  return rows.filter((row) => row.text.trim() || row.time.trim()).length;
}

function normalizeTimetableTimeInput(value: string): string {
  const digits = value.replace(/\D/gu, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function SchedulePhotoSlots({
  day,
  onChange,
  programId,
}: {
  day: HostProgramItineraryDay;
  onChange: (patch: Partial<HostProgramItineraryDay>) => void;
  programId: string;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const images = uniqueImages([day.image, ...day.images]).slice(0, 5);

  async function handleUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const image = await uploadProgramImage(file, programId, `schedule-${day.id}`);
      const nextImages = [...images];
      nextImages[index] = image;
      const normalizedImages = uniqueImages(nextImages).slice(0, 5);
      onChange({
        image: normalizedImages[0] ?? "",
        images: normalizedImages,
      });
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <div className="mt-[var(--figma-8)] flex gap-[var(--figma-12)]">
      {Array.from({ length: 5 }).map((_, index) => {
        const image = images[index] ?? "";
        return (
          <label
            className="flex h-[var(--figma-111)] w-[var(--figma-96)] cursor-pointer flex-col items-center justify-center gap-[var(--figma-7)] rounded-[var(--figma-7)] border-[0.5px] border-solid border-[#F7B267] bg-[#F9F9F9] bg-cover bg-center text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#D9D9D9] transition hover:border-[#FE701E] hover:text-[#FE701E]"
            key={index}
            style={image ? { backgroundImage: `url("${image}")` } : undefined}
          >
            <span className={image ? "rounded bg-white/85 px-2 py-1" : ""}>
              {uploadingIndex === index ? "업로드 중" : image ? "변경" : "파일 업로드"}
            </span>
            {!image ? (
              <Upload
                aria-hidden="true"
                className="size-[var(--figma-12)] text-[#FE701E]"
                strokeWidth={1.8}
              />
            ) : null}
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void handleUpload(index, event.target.files?.[0]);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        );
      })}
    </div>
  );
}

function PlacePanel({
  draft,
  updatedAt,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updatedAt: string;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  function updatePlaceInfo(patch: Partial<HostProgramPlaceInfo>) {
    updateDraft({
      placeInfo: {
        ...draft.placeInfo,
        ...patch,
      },
    });
  }

  const accommodationSameAsMeeting =
    draft.placeInfo.accommodationName.trim().length > 0 &&
    draft.placeInfo.accommodationName.trim() ===
      draft.placeInfo.meetingAddress.trim();

  function toggleAccommodationSameAsMeeting(checked: boolean) {
    updatePlaceInfo({
      accommodationEnabled: checked ? true : draft.placeInfo.accommodationEnabled,
      accommodationName: checked ? draft.placeInfo.meetingAddress : "",
    });
  }

  return (
    <SettingsPreviewLayout draft={draft} updatedAt={updatedAt}>
      <div className="flex flex-col gap-[var(--figma-32)]">
        <DetailFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>프로그램 지역</SettingsFieldLabel>
            <div className="grid grid-cols-2 gap-[var(--figma-14)]">
              <FigmaTextInput
                onChange={(region) => updateDraft({ region })}
                placeholder="시 / 도 입력"
                value={draft.region}
              />
              <FigmaTextInput
                onChange={(city) => updateDraft({ city })}
                placeholder="시/ 군 / 구 입력"
                value={draft.city}
              />
            </div>
          </div>
        </DetailFormBlock>

        <DetailFormBlock paddingClassName="px-[var(--figma-22)] pb-[var(--figma-14)] pt-0">
          <div className="flex w-full flex-col gap-[var(--figma-12)]">
            <SettingsFieldLabel>집결지 안내</SettingsFieldLabel>
            <AddressSearchField
              address={draft.placeInfo.meetingAddress}
              addressDetail={draft.placeInfo.meetingAddressDetail}
              label="주소"
              onAddressChange={(meetingAddress) => updatePlaceInfo({ meetingAddress })}
              onAddressDetailChange={(meetingAddressDetail) =>
                updatePlaceInfo({ meetingAddressDetail })
              }
            />
            <MapPreviewBox address={draft.placeInfo.meetingAddress} />
            <FigmaTextarea
              description="집결지 장소에 대해 추가 안내사항이 있다면 입력해주세요"
              heightClass="h-[var(--figma-31)]"
              onChange={(meetingMemo) => updatePlaceInfo({ meetingMemo })}
              placeholder="예 : 00옆 00출구 앞 , 담당자 피켓 확인 장소 등"
              title="집결지 추가 안내 사항 (선택)"
              value={draft.placeInfo.meetingMemo}
            />
            <SettingsFieldLabel>담당자 연락처 (선택)</SettingsFieldLabel>
            <div className="grid grid-cols-2 gap-[var(--figma-22)]">
              <FigmaTextInput
                onChange={(phone) => updateDraft({ phone })}
                placeholder="전화번호"
                value={draft.phone}
              />
              <FigmaTextInput
                inputMode="email"
                onChange={(contactEmail) => updateDraft({ contactEmail })}
                placeholder="문의 수신 이메일"
                value={draft.contactEmail ?? ""}
              />
            </div>
          </div>
        </DetailFormBlock>

        <DetailFormBlock paddingClassName="px-[var(--figma-22)] pb-[var(--figma-21)] pt-0">
          <div className="flex w-full flex-col">
            <FigmaTextarea
              heightClass="h-[var(--figma-31)]"
              onChange={(parkingGuide) => updatePlaceInfo({ parkingGuide })}
              placeholder="예 : 전용 주차장 주소, 인근 공영 주차장 주소, 행사장 내 주차 불가 안내 등"
              title="주차 안내"
              value={draft.placeInfo.parkingGuide}
            />
          </div>
        </DetailFormBlock>

        <DetailFormBlock paddingClassName="px-[var(--figma-22)] pb-[var(--figma-19)] pt-0">
          <div className="flex w-full flex-col">
            <FigmaTextarea
              description="자차 없이 도착할 수 있는 대중교통 방법을 안내해주세요"
              heightClass="h-[var(--figma-31)]"
              onChange={(transportGuide) => updatePlaceInfo({ transportGuide })}
              placeholder="예 : 집결지 인근 정류장 과 버스 노선 , 지하철 후 오시는 길 등"
              title="교통 안내"
              value={draft.placeInfo.transportGuide}
            />
          </div>
        </DetailFormBlock>

        <DetailFormBlock paddingClassName="px-[var(--figma-22)] pb-[var(--figma-16)] pt-0">
          <div className="flex w-full flex-col gap-[var(--figma-12)]">
            <div className="flex items-center gap-[var(--figma-12)]">
              <div className="shrink-0 whitespace-nowrap">
                <SettingsFieldLabel>숙소 안내</SettingsFieldLabel>
              </div>
              <ToggleRow
                checked={draft.placeInfo.accommodationEnabled}
                label="숙소여부"
                onChange={(accommodationEnabled) =>
                  updatePlaceInfo({ accommodationEnabled })
                }
              />
            </div>
            <label className="flex items-center gap-[var(--figma-8)] text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
              <input
                checked={accommodationSameAsMeeting}
                className="size-[var(--figma-18)] rounded-[4px] border border-[#6D7A8A] accent-[#FE701E]"
                disabled={!draft.placeInfo.meetingAddress.trim()}
                onChange={(event) =>
                  toggleAccommodationSameAsMeeting(event.target.checked)
                }
                type="checkbox"
              />
              집결지와 동일한 장소에요
            </label>
            <AddressSearchField
              address={draft.placeInfo.accommodationName}
              addressDetail=""
              label="주소"
              onAddressChange={(accommodationName) =>
                updatePlaceInfo({ accommodationName })
              }
              onAddressDetailChange={() => undefined}
            />
            <MapPreviewBox address={draft.placeInfo.accommodationName} />
            <FigmaTextarea
              description="숙소에 대해 추가 안내사항이 있다면 입력해주세요"
              heightClass="h-[var(--figma-31)]"
              onChange={(accommodationMemo) =>
                updatePlaceInfo({ accommodationMemo })
              }
              placeholder="예 : 체크인 시간, 준비물, 방 배정 방식 등"
              title="숙소 추가 안내 사항 (선택)"
              value={draft.placeInfo.accommodationMemo}
            />
            <SettingsFieldLabel>담당자 연락처 (선택)</SettingsFieldLabel>
            <div className="grid grid-cols-2 gap-[var(--figma-22)]">
              <FigmaTextInput
                onChange={(phone) => updateDraft({ phone })}
                placeholder="전화번호"
                value={draft.phone}
              />
              <FigmaTextInput
                inputMode="email"
                onChange={(contactEmail) => updateDraft({ contactEmail })}
                placeholder="문의 수신 이메일"
                value={draft.contactEmail ?? ""}
              />
            </div>
          </div>
        </DetailFormBlock>
      </div>
    </SettingsPreviewLayout>
  );
}

function FigmaTextarea({
  description,
  heightClass = "h-[var(--figma-50)]",
  onChange,
  placeholder,
  title,
  value,
}: {
  description?: string;
  heightClass?: string;
  onChange: (value: string) => void;
  placeholder: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-[var(--figma-14)]">
      <SettingsFieldLabel>{title}</SettingsFieldLabel>
      {description ? (
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          {description}
        </p>
      ) : null}
      <textarea
        className={`${heightClass} resize-none rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] py-[var(--figma-8)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ fontSize: "var(--figma-12)" }}
        value={value}
      />
    </div>
  );
}

function MapPreviewBox({ address }: { address: string }) {
  return (
    <KakaoMap
      address={address}
      className="h-[var(--figma-185)] min-h-0 rounded-[var(--figma-7)]"
      markerLabel="프로그램 위치"
    />
  );
}

function GuidePanel({
  draft,
  updatedAt,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updatedAt: string;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  function updateGuideInfo(patch: Partial<HostProgramGuideInfo>) {
    updateDraft({
      guideInfo: {
        ...draft.guideInfo,
        ...patch,
      },
    });
  }

  return (
    <SettingsPreviewLayout draft={draft} updatedAt={updatedAt}>
      <div className="flex flex-col gap-[var(--figma-32)]">
        <GuideItemsBlock
          description="참가비에 포함된 항목을 입력해주세요"
          items={draft.guideInfo.includedItems}
          onChange={(includedItems) => updateGuideInfo({ includedItems })}
          placeholders={["숙박 2박", "프로그램 체험비 전체"]}
          title="포함 사항"
        />
        <GuideItemsBlock
          description="참가비에 불포함된 항목을 입력해주세요"
          items={draft.guideInfo.excludedItems}
          onChange={(excludedItems) => updateGuideInfo({ excludedItems })}
          placeholders={["개인 교통비", "점심 식사 비용"]}
          title="불포함 사항"
        />
        <GuideItemsBlock
          description="참가 전 준비물과 프로그램 진행 시 꼭 알아야 할 사항을 입력해주세요"
          items={draft.guideInfo.preparationItems}
          onChange={(preparationItems) => updateGuideInfo({ preparationItems })}
          placeholders={["편한 복장, 개인 운동화", "음주 후 참가는 삼가주세요"]}
          title="준비물 및 참고사항"
        />
        <RefundRulesBlock
          onChange={(refundRules) => updateGuideInfo({ refundRules })}
          rules={draft.guideInfo.refundRules}
        />
      </div>
    </SettingsPreviewLayout>
  );
}

function GuideItemsBlock({
  description,
  items,
  onChange,
  placeholders,
  title,
}: {
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholders: string[];
  title: string;
}) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addItem() {
    onChange([...items, ""]);
  }

  function removeItem(index: number) {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextItems.length > 0 ? nextItems : [""]);
  }

  return (
    <DetailFormBlock className="h-[var(--figma-219)] shrink-0">
      <div className="flex w-full flex-col gap-[var(--figma-14)]">
        <SettingsFieldLabel>{title}</SettingsFieldLabel>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          {description}
        </p>
        <div className="flex flex-col gap-[var(--figma-14)]">
          {items.map((item, index) => (
            <div className="flex h-[var(--figma-31)] items-center gap-[var(--figma-8)]" key={index}>
              <span
                aria-hidden="true"
                className="size-[var(--figma-8)] shrink-0 rounded-full bg-[#CAC4BC]"
              />
              <FigmaTextInput
                className="min-w-0 flex-1 !border-[#CAC4BC]"
                onChange={(value) => updateItem(index, value)}
                placeholder={`예 : ${placeholders[index] ?? placeholders[0] ?? "항목"}`}
                value={item}
              />
              <button
                aria-label={`${title} 항목 삭제`}
                className="grid size-[var(--figma-12)] shrink-0 place-items-center rounded-full bg-[#CAC4BC] text-white transition hover:bg-[#6D7A8A]"
                onClick={() => removeItem(index)}
                type="button"
              >
                <Minus aria-hidden="true" className="size-[var(--figma-6)]" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="mx-auto flex h-[var(--figma-15)] items-center gap-[var(--figma-4)] text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={addItem}
          type="button"
        >
          <span
            aria-hidden="true"
            className="grid size-[var(--figma-12)] place-items-center rounded-full bg-[#6D7A8A] text-white"
          >
            <Plus className="size-[var(--figma-7)]" strokeWidth={2} />
          </span>
          항목 추가
        </button>
      </div>
    </DetailFormBlock>
  );
}

function RefundRulesBlock({
  onChange,
  rules,
}: {
  onChange: (rules: HostProgramRefundRule[]) => void;
  rules: HostProgramRefundRule[];
}) {
  function updateRule(index: number, patch: Partial<HostProgramRefundRule>) {
    onChange(
      rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  }

  function addRule() {
    onChange([
      ...rules,
      {
        daysBefore: "",
        id: `refund-${Date.now()}`,
        refundRate: "",
      },
    ]);
  }

  function removeRule(index: number) {
    const nextRules = rules.filter((_, ruleIndex) => ruleIndex !== index);
    onChange(
      nextRules.length > 0
        ? nextRules
        : [
            {
              daysBefore: "",
              id: `refund-${Date.now()}`,
              refundRate: "",
            },
          ],
    );
  }

  return (
    <DetailFormBlock className="h-[var(--figma-251)] shrink-0">
      <div className="flex w-full flex-col gap-[var(--figma-14)]">
        <SettingsFieldLabel>취소 / 환불 규정</SettingsFieldLabel>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          취소 기간과 환불 비율만 입력하면 자동으로 규정이 완성돼요
        </p>
        <div className="flex flex-col gap-[var(--figma-14)]">
          {rules.map((rule, index) => (
            <div className="flex h-[var(--figma-31)] items-center gap-[var(--figma-8)]" key={rule.id}>
              <span
                aria-hidden="true"
                className="size-[var(--figma-8)] shrink-0 rounded-full bg-[#CAC4BC]"
              />
              <FigmaTextInput
                className="w-[var(--figma-72)] shrink-0 !border-[#CAC4BC]"
                inputMode="numeric"
                onChange={(daysBefore) => updateRule(index, { daysBefore })}
                placeholder="00"
                value={rule.daysBefore}
              />
              <span className="w-[var(--figma-72)] shrink-0 text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                일 전 취소 시
              </span>
              <FigmaTextInput
                className="w-[var(--figma-72)] shrink-0 !border-[#CAC4BC]"
                inputMode="numeric"
                onChange={(refundRate) => updateRule(index, { refundRate })}
                placeholder="00"
                value={rule.refundRate}
              />
              <span className="w-[var(--figma-40)] shrink-0 text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                % 환불
              </span>
              <button
                aria-label="환불 규정 삭제"
                className="grid size-[var(--figma-12)] shrink-0 place-items-center rounded-full bg-[#CAC4BC] text-white transition hover:bg-[#6D7A8A]"
                onClick={() => removeRule(index)}
                type="button"
              >
                <Minus aria-hidden="true" className="size-[var(--figma-6)]" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="flex h-[var(--figma-15)] w-fit items-center gap-[var(--figma-4)] text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={addRule}
          type="button"
        >
          <span
            aria-hidden="true"
            className="grid size-[var(--figma-12)] place-items-center rounded-full bg-[#6D7A8A] text-white"
          >
            <Plus className="size-[var(--figma-7)]" strokeWidth={2} />
          </span>
          항목 추가
        </button>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          [고정안내] 당일 취소 및 노쇼의 경우 환불이 불가합니다
        </p>
      </div>
    </DetailFormBlock>
  );
}

function ManagementPanel({}: {
  draft: HostProgramDraft;
  publishBlockers: ProgramDraftChecklistItem[];
  readyToPublish: boolean;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <div className="pt-[var(--figma-47,47px)]" style={figmaScaleStyle}>
      <div className="w-[62.708vw] max-w-[1204px] border-b border-[#CAC4BC]">
        <div className="flex h-[27px] items-start gap-[12px] text-[14px] leading-[1.253]">
          <button
            className="relative h-[27px] font-semibold text-[#5B3A29] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:bg-[#FE701E]"
            type="button"
          >
            쿠폰
          </button>
          <button className="h-[27px] font-normal text-[#CAC4BC]" type="button">
            프로모션
          </button>
        </div>
      </div>

      <section className="mt-[24px] h-[33.819vw] min-h-[487px] max-h-[649px] w-[62.708vw] max-w-[1204px] rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--figma-57)] py-[var(--figma-32)]">
        <div className="grid w-[54.583vw] max-w-[1048px] gap-[var(--figma-20)] text-[#5B3A29]">
          <CouponField label="쿠폰명" placeholder="발급할 쿠폰의 이름을 적어주세요" />
          <CouponField label="사용 안내사항" placeholder="쿠폰 사용시 적용 범위 또는 안내사항을 적어주세요" />

          <div>
            <p className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
              할인 방식
            </p>
            <div className="mt-[10px] flex items-center gap-[16px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
              <label className="inline-flex items-center gap-[6px]">
                <input className="size-[14px]" name="coupon-discount" type="radio" />
                정률 (%)
              </label>
              <label className="inline-flex items-center gap-[6px]">
                <input className="size-[14px]" name="coupon-discount" type="radio" />
                정액 (원)
              </label>
            </div>
            <input
              className="mt-[8px] h-[var(--figma-30)] w-[33.611vw] max-w-[645px] rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[12px] text-[#6D7A8A] outline-none"
              placeholder="00"
            />
          </div>

          <div>
            <p className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
              수량
            </p>
            <div className="mt-[10px] flex items-center gap-[16px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
              <label className="inline-flex items-center gap-[6px]">
                <input className="size-[14px]" name="coupon-quantity" type="radio" />
                무제한
              </label>
              <label className="inline-flex items-center gap-[6px]">
                <input className="size-[14px]" name="coupon-quantity" type="radio" />
                수량 제한
              </label>
              <input
                className="h-[var(--figma-30)] w-[22.222vw] max-w-[427px] rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[12px] text-[#6D7A8A] outline-none"
                placeholder="00"
              />
            </div>
          </div>

          <div>
            <p className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
              사용 기간
            </p>
            <div
              className="mt-[10px] grid w-[51.875vw] max-w-[996px] items-center"
              style={{
                gridTemplateColumns:
                  "minmax(0,1fr) var(--figma-26) minmax(0,1fr)",
              }}
            >
              <CouponDateInput placeholder="시작일" />
              <span className="h-[5px] w-[var(--figma-22)] justify-self-center bg-[#6D7A8A]" />
              <CouponDateInput placeholder="종료일" />
            </div>
          </div>

          <button
            className="h-[29px] w-[82px] rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E]"
            type="button"
          >
            쿠폰 저장
          </button>
        </div>
      </section>

      <section className="mt-[30px] w-[62.708vw] max-w-[1204px]">
        <div className="flex gap-[10px]">
          {["전체", "진행", "종료"].map((label, index) => (
            <button
              className={`h-[29px] w-[70px] rounded-[999px] text-[12px] font-semibold leading-[1.253] ${
                index === 0 ? "bg-[#FF9A3D] text-white" : "bg-[#CAC4BC] text-white"
              }`}
              key={label}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-[15px] grid gap-[8px] border-t border-[#F3F3F3] pt-[14px]">
          {couponRows.length > 0 ? (
            couponRows.map((coupon) => (
              <div
                className="grid h-[31px] items-center rounded-[4px] border border-[#D9D9D9] bg-white px-[10px] text-[14px] font-medium leading-[1.253] text-[#6D7A8A]"
                key={coupon.name}
                style={{
                  gridTemplateColumns:
                    "76px minmax(0,190px) minmax(0,210px) minmax(0,120px) minmax(0,220px) 28px 28px",
                }}
              >
                <span
                  className={`inline-flex h-[21px] w-[35px] items-center justify-center rounded-[4px] text-[12px] font-semibold text-white ${
                    coupon.status === "종료" ? "bg-[#6D7A8A]" : "bg-[#7A8B52]"
                  }`}
                >
                  {coupon.status}
                </span>
                <span className="truncate">{coupon.name}</span>
                <span>{coupon.discount}</span>
                <span>{coupon.quantity}</span>
                <span>{coupon.deadline}</span>
                <button
                  aria-label={`${coupon.name} 수정`}
                  className="grid size-[22px] place-items-center justify-self-end text-[#6D7A8A] hover:text-[#FE701E]"
                  type="button"
                >
                  <Pencil className="size-[16px]" strokeWidth={1.8} />
                </button>
                <button
                  aria-label={`${coupon.name} 삭제`}
                  className="grid size-[22px] place-items-center justify-self-end text-[#6D7A8A] hover:text-[#FE701E]"
                  type="button"
                >
                  <Trash2 className="size-[16px]" strokeWidth={1.8} />
                </button>
              </div>
            ))
          ) : (
            <div className="flex h-[78px] items-center justify-center rounded-[4px] border border-dashed border-[#CAC4BC] bg-white text-[14px] font-semibold leading-[1.253] text-[#6D7A8A]">
              발급된 쿠폰이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type CouponManagementRow = {
  deadline: string;
  discount: string;
  name: string;
  quantity: string;
  status: "진행" | "종료";
};

const couponRows: CouponManagementRow[] = [];

function CouponField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="grid gap-[10px]">
      <span className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      <input
        className="h-[var(--figma-30)] w-full rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D9D9D9]"
        placeholder={placeholder}
      />
    </label>
  );
}

function CouponDateInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative h-[var(--figma-36)] rounded-[4px] border border-[#FF9A3D] bg-white">
      <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[12px] font-normal leading-[1.253] text-[#D9D9D9]">
        {placeholder}
      </span>
      <CalendarDays className="absolute right-[12px] top-1/2 size-[18px] -translate-y-1/2 text-[#6D7A8A]" />
    </div>
  );
}

function DeletePanel({
  alarmSubscriberCount,
  applicationCount,
  draft,
  isDeleting,
  onDelete,
  paidApplicantCount,
  paymentRecordCount,
  receiptsHref,
  reviewCount,
}: {
  alarmSubscriberCount: number;
  applicationCount: number;
  draft: HostProgramDraft;
  isDeleting: boolean;
  onDelete: () => void;
  paidApplicantCount: number;
  paymentRecordCount: number;
  receiptsHref: string;
  reviewCount: number;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const canDelete = confirmed && deleteName.trim() === draft.title.trim();
  const alarmSubscriberLabel = formatDeletePersonCount(alarmSubscriberCount);
  const applicationPersonLabel = formatDeletePersonCount(applicationCount);
  const applicationRecordLabel = formatDeleteRecordCount(applicationCount);
  const paidApplicantLabel = formatDeletePersonCount(paidApplicantCount);
  const paymentRecordLabel = formatDeleteRecordCount(paymentRecordCount);
  const reviewLabel = formatDeleteRecordCount(reviewCount);

  return (
    <div className="pt-[var(--figma-47)]" style={figmaScaleStyle}>
      <section className="w-[57.5vw] max-w-[1104px] rounded-[6px] border border-[#C75C36] bg-white px-[var(--figma-16)] py-[var(--figma-16)] text-[16px] font-semibold leading-[1.45] text-[#0D0D0C]">
        <p>
          프로그램을 삭제하면 상세페이지, 신청 기록, 입금 기록 등{" "}
          <span className="text-[#FE701E]">모든 데이터가 영구적으로 삭제돼요.</span>
        </p>
        <p className="text-[#FE701E]">삭제 후 데이터는 복구할 수 없어요</p>
      </section>

      <div className="ml-[var(--figma-6)] mt-[28px] grid w-[56.667vw] max-w-[1088px] grid-cols-3 gap-[2.778vw]">
        <DeleteMetric label="알람 신청자" value={alarmSubscriberLabel} />
        <DeleteMetric label="신청서 접수자" value={applicationPersonLabel} />
        <DeleteMetric highlight label="입금 완료자" value={paidApplicantLabel} />
      </div>

      <label className="mt-[14px] flex h-[20px] items-center gap-[10px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        <input className="size-[16px]" type="checkbox" />
        삭제 시 위 인원에게 프로그램 취소 안내가 자동 발송돼요
      </label>

      <div className="ml-[var(--figma-6)] mt-[16px] flex h-[var(--figma-45)] w-[56.667vw] max-w-[1088px] items-center justify-between rounded-[6px] border border-[#0D0D0C] bg-[#F5E1D3] px-[var(--figma-18)] text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
        <span>
          입금 완료자 <span className="text-[#FE701E]">{paidApplicantLabel}</span>의 환불 처리가 필요해요
        </span>
        <Link
          className="text-[16px] font-semibold leading-[1.253] text-[#D75A2B] underline-offset-2"
          href={receiptsHref}
        >
          결제 관리로 이동 -&gt;
        </Link>
      </div>

      <hr className="mt-[24px] w-[57.5vw] max-w-[1104px] border-[#6D7A8A]" />

      <div className="mt-[29px] grid w-[57.5vw] max-w-[1104px] grid-cols-3 gap-[1.458vw]">
        {launchFeatureFlags.reviews ? (
          <DeleteCheckMetric label="삭제되는 후기" value={reviewLabel} />
        ) : null}
        <DeleteCheckMetric label="삭제되는 신청 기록" value={applicationRecordLabel} />
        <DeleteCheckMetric label="삭제되는 결제 기록" value={paymentRecordLabel} />
      </div>

      <label className="mt-[30px] flex items-center gap-[10px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        <input
          checked={confirmed}
          className="size-[16px]"
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />
        해당 프로그램에 대한 모든 데이터는 영구적으로 삭제 후 복구할 수 없어요
      </label>

      <p className="mt-[28px] text-[16px] font-semibold leading-[1.253] text-[#6D7A8A]">
        프로그램 삭제를 진행하려면{" "}
        <span className="text-[#FE701E]">&lt; 해당 프로그램 명 &gt;</span> 을 정확히 입력해 주세요.
      </p>
      <input
        className="mt-[12px] h-[var(--figma-31)] w-[57.5vw] max-w-[1104px] rounded-[7px] border border-[#6D7A8A] bg-white px-[12px] text-[12px] font-normal leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
        onChange={(event) => setDeleteName(event.target.value)}
        placeholder="프로그램명을 입력하세요"
        value={deleteName}
      />

      <div className="mt-[13px] -ml-[var(--figma-40)] flex h-[var(--figma-69,69px)] w-[calc(100vw-var(--figma-228))] items-center border-t border-[#6D7A8A] bg-white pl-[var(--figma-28)]">
        <button
          className="h-[29px] w-[122px] rounded-[4px] border border-[#D9D9D9] bg-[#F9F9F9] text-[12px] font-normal leading-[1.253] text-[#CAC4BC] disabled:cursor-not-allowed"
          disabled={!canDelete || isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? "삭제 중" : "프로그램 삭제하기"}
        </button>
      </div>
    </div>
  );
}

function DeleteMetric({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-[var(--figma-45)] items-center justify-between rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--figma-18)] text-[16px] leading-[1.253]">
      <span className="font-medium text-[#6D7A8A]">{label}</span>
      <span className={highlight ? "font-semibold text-[#FE701E]" : "font-semibold text-[#0D0D0C]"}>
        {value}
      </span>
    </div>
  );
}

function DeleteCheckMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-[var(--figma-45)] items-center justify-between rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--figma-16)] text-[16px] leading-[1.253]">
      <span className="flex items-center gap-[var(--figma-10)] font-medium text-[#6D7A8A]">
        <span aria-hidden="true" className="size-[var(--figma-16)] rounded-[4px] border border-[#CAC4BC]" />
        {label}
      </span>
      <span className="font-semibold text-[#0D0D0C]">{value}</span>
    </div>
  );
}

function formatDeletePersonCount(value: number): string {
  return `${formatDeleteCount(value)} 명`;
}

function formatDeleteRecordCount(value: number): string {
  return `${formatDeleteCount(value)} 건`;
}

function formatDeleteCount(value: number): string {
  return Math.max(0, value).toLocaleString("ko-KR");
}

type DashboardOnboardingStep = {
  done: boolean;
  helper: string;
  href: string;
  id: string;
  label: string;
};

const dashboardStepCopy: Record<
  string,
  { action: string; helper: string; label: string }
> = {
  "application-form": {
    action: "연결하기",
    helper: "신청폼이 없으면 게스트가 신청할 수 없어요. 기존 폼을 가져오거나 새로 만들어주세요",
    label: "신청폼 연결",
  },
  basic: {
    action: "작성하기",
    helper: "프로그램 제목, 카테고리, 지역, 정원, 참가비를 입력해주세요",
    label: "기본정보",
  },
  detail: {
    action: "작성하기",
    helper: "대표사진, 짧은 요약, 상세설명 등 프로그램에 대해 입력해 주세요",
    label: "상세정보",
  },
  operation: {
    action: "작성하기",
    helper: "프로그램 진행 시 안내사항, 포함 및 불포함 항목 등 입력해 주세요",
    label: "안내사항",
  },
  place: {
    action: "작성하기",
    helper: "집결지, 숙소, 등 주요 활동 장소를 입력해 주세요",
    label: "장소안내",
  },
  schedule: {
    action: "작성하기",
    helper: "1일차, 2일차 등 일정 타임라인을 입력해주세요",
    label: "일정안내",
  },
};

function DashboardChecklistRow({ step }: { step: DashboardOnboardingStep }) {
  const copy = dashboardStepCopy[step.id] ?? {
    action: "작성하기",
    helper: step.helper,
    label: step.label,
  };

  return (
    <div className="flex h-[3.75vw] min-h-[54px] max-h-[72px] w-full items-center gap-[1.944vw] rounded-[6px] border border-[#D9D9D9] p-[0.833vw]">
      <span
        aria-hidden="true"
        className={`size-[16px] shrink-0 rounded-[4px] border ${
          step.done
            ? "border-[#FE701E] bg-[#FE701E]"
            : "border-[#CAC4BC] bg-transparent"
        }`}
      />
      <p className="shrink-0 text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
        {copy.label}
      </p>
      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
        {copy.helper}
      </p>
      <Link
        className="inline-flex h-[29px] shrink-0 items-center justify-center rounded-[4px] border-[0.8px] border-[#FE701E] bg-[#FCFCFC] px-[18px] text-[12px] font-normal leading-[1.253] text-[#FE701E]"
        href={step.href}
      >
        {copy.action}
      </Link>
    </div>
  );
}

function DashboardFooter({
  canDelete,
  dashboardState,
  onDelete,
  onNextRound,
  onOpenSchedule,
  onProgramCopy,
  onSave,
}: {
  canDelete: boolean;
  dashboardState: ProgramDashboardState;
  onDelete: () => void;
  onNextRound: () => void;
  onOpenSchedule: () => void;
  onProgramCopy: () => void;
  onSave: () => void;
}) {
  if (dashboardState === "creating") {
    return (
      <div className="flex w-full gap-[1.806vw] border-t border-[#6D7A8A] bg-white px-[1.944vw] py-[1.389vw]">
        <DashboardFooterButton onClick={onOpenSchedule} tone="orange">
          오픈 예약하기
        </DashboardFooterButton>
        <DashboardFooterButton disabled={!canDelete} onClick={onDelete} tone="sand">
          프로젝트 삭제
        </DashboardFooterButton>
      </div>
    );
  }

  if (dashboardState === "ended") {
    return (
      <div className="flex w-full gap-[1.806vw] border-t border-[#6D7A8A] bg-white px-[1.944vw] py-[1.389vw]">
        <DashboardFooterButton onClick={onNextRound} tone="outline-orange">
          다음 기수 모집
        </DashboardFooterButton>
        <DashboardFooterButton onClick={onProgramCopy} tone="slate">
          프로그램 복사
        </DashboardFooterButton>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-[1.806vw] border-t border-[#6D7A8A] bg-white px-[1.944vw] py-[1.389vw]">
      <DashboardFooterButton onClick={onSave} tone="orange">
        저장하기
      </DashboardFooterButton>
      <DashboardFooterButton onClick={onProgramCopy} tone="slate">
        프로그램 복사
      </DashboardFooterButton>
    </div>
  );
}

function DashboardFooterButton({
  children,
  disabled = false,
  onClick,
  tone,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone: "orange" | "outline-orange" | "sand" | "slate";
}) {
  const toneClassName =
    tone === "orange"
      ? "bg-[#FE701E] text-[#FFF6EC]"
      : tone === "outline-orange"
        ? "border-[0.8px] border-[#FE701E] bg-[#FCFCFC] text-[#FE701E]"
        : tone === "slate"
          ? "bg-[#6D7A8A] text-[#FFF6EC]"
          : "bg-[#CAC4BC] text-[#FFF6EC]";

  return (
    <button
      className={`inline-flex h-[29px] items-center justify-center rounded-[4px] px-[19px] text-[12px] font-medium leading-[1.253] disabled:cursor-not-allowed disabled:opacity-60 ${toneClassName}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function OnboardingRequiredDialog({
  blockers,
  formsHref,
  onClose,
  programPath,
}: {
  blockers: ProgramDraftChecklistItem[];
  formsHref: string;
  onClose: () => void;
  programPath: string;
}) {
  const firstBlocker = blockers[0];

  return (
    <ProgramDashboardModal onClose={onClose}>
      <h2 className="text-[18px] font-bold leading-[1.253] text-[#0D0D0C]">
        아직 필수 항목들이 작성되지 않았어요!
      </h2>
      <p className="mt-3 text-[13px] font-medium leading-[1.6] text-[#6D7A8A]">
        오픈 예약을 하려면 아래 온보딩 항목을 먼저 완료해주세요.
      </p>
      <div className="mt-4 grid gap-2">
        {blockers.map((item) => (
          <div
            className="rounded-[6px] border border-[#F3E2D5] bg-[#FFF8F2] px-3 py-2"
            key={item.id}
          >
            <p className="text-[13px] font-bold leading-[1.253] text-[#5B3A29]">
              {item.label}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-[1.45] text-[#6D7A8A]">
              {item.helper}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="inline-flex h-[32px] items-center rounded-[4px] bg-[#CAC4BC] px-4 text-[12px] font-bold leading-[1.253] text-white"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
        {firstBlocker ? (
          <Link
            className="inline-flex h-[32px] items-center rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-bold leading-[1.253] text-white"
            href={getChecklistHref(firstBlocker.id, programPath, formsHref)}
          >
            작성하러 가기
          </Link>
        ) : null}
      </div>
    </ProgramDashboardModal>
  );
}

function OpenScheduleDialog({
  deadlineMode,
  isSaving,
  onDeadlineModeChange,
  onClose,
  onSchedule,
  onScheduledCloseDateChange,
  onScheduledDateChange,
  scheduledCloseDate,
  scheduledDate,
}: {
  deadlineMode: DashboardDeadlineMode;
  isSaving: boolean;
  onDeadlineModeChange: (value: DashboardDeadlineMode) => void;
  onClose: () => void;
  onSchedule: () => void;
  onScheduledCloseDateChange: (value: string) => void;
  onScheduledDateChange: (value: string) => void;
  scheduledCloseDate: string;
  scheduledDate: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <h2 className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
        오픈 일정 설정
      </h2>
      <p className="mt-[16px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        오픈일과 모집 마감 방식을 설정해주세요.
      </p>
      <div className="mt-[16px] grid gap-[16px]">
        <DashboardModalField label="오픈 예정일">
          <DashboardDateInput
            onChange={onScheduledDateChange}
            value={scheduledDate}
          />
        </DashboardModalField>
        <DashboardModalField label="마감 예정일">
          <div className="grid gap-[6px]">
            <DashboardRadioOption
              checked={deadlineMode === "auto"}
              label="모집 완료 시 자동 마감"
              onClick={() => onDeadlineModeChange("auto")}
            />
            <DashboardRadioOption
              checked={deadlineMode === "manual"}
              label="마감 날짜 직접 설정"
              onClick={() => onDeadlineModeChange("manual")}
            />
            <DashboardDateInput
              disabled={deadlineMode === "auto"}
              onChange={onScheduledCloseDateChange}
              value={scheduledCloseDate}
            />
          </div>
        </DashboardModalField>
      </div>
      <div className="flex w-full justify-end pt-[12px]">
        <DashboardModalButton
          disabled={isSaving || !scheduledDate}
          onClick={onSchedule}
          width="compact"
        >
          {isSaving ? "저장 중" : "생성"}
        </DashboardModalButton>
      </div>
    </ProgramDashboardModal>
  );
}

function CopyProgramDialog({
  isSaving,
  onClose,
  onCopy,
  onTitleChange,
  title,
}: {
  isSaving: boolean;
  onClose: () => void;
  onCopy: () => void;
  onTitleChange: (value: string) => void;
  title: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <h2 className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
        프로그램 복사
      </h2>
      <div className="mt-[21px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        <p>복사된 프로그램은</p>
        <p>호스트 페이지 [내 프로그램 &gt; 예정 프로그램]에서 확인 가능합니다.</p>
      </div>
      <input
        className="mt-[21px] h-[30px] w-full rounded-[7px] border-[0.5px] border-[#F7B267] bg-[#F9F9F9] px-[12px] text-[12px] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="해당 프로그램 이름(2)"
        value={title}
      />
      <div className="flex w-full justify-end pt-[12px]">
        <DashboardModalButton
          disabled={isSaving || !title.trim()}
          onClick={onCopy}
          width="compact"
        >
          {isSaving ? "저장 중" : "생성"}
        </DashboardModalButton>
      </div>
    </ProgramDashboardModal>
  );
}

function AdditionalRecruitmentDialog({
  approvedCount,
  capacity,
  currentEndDate,
  endDate,
  isSaving,
  onCapacityChange,
  onClose,
  onEndDateChange,
  onStart,
  requestedCapacity,
}: {
  approvedCount: number;
  capacity: string;
  currentEndDate: string;
  endDate: string;
  isSaving: boolean;
  onCapacityChange: (value: string) => void;
  onClose: () => void;
  onEndDateChange: (value: string) => void;
  onStart: () => void;
  requestedCapacity: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <div className="grid gap-[22px]">
        <div className="grid gap-[12px] text-[14px] leading-[1.253]">
          <h2 className="font-medium text-[#0D0D0C]">추가 모집</h2>
          <p className="font-normal text-[#6D7A8A]">
            마감일 연장 또는 정원을 추가해 모집을 이어나갈 수 있어요
          </p>
        </div>
        <DashboardModalField label="마감일 변경">
          <p className="px-[6px] text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
            현재 마감일 : {formatDashboardDate(currentEndDate)}
          </p>
          <DashboardDateInput onChange={onEndDateChange} value={endDate} />
        </DashboardModalField>
        <DashboardModalField label="정원 추가">
          <div className="flex gap-[12px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
            <p>현재 정원 : {capacity || "00명"}</p>
            <p>승인 인원 : {approvedCount}명</p>
          </div>
          <DashboardUnitInput
            onChange={onCapacityChange}
            unit="명"
            value={requestedCapacity}
          />
        </DashboardModalField>
        <DashboardModalButton disabled={isSaving} onClick={onStart} width="full">
          {isSaving ? "저장 중" : "추가 모집 시작"}
        </DashboardModalButton>
      </div>
    </ProgramDashboardModal>
  );
}

function NextRoundDialog({
  capacity,
  closeDate,
  currentCapacity,
  currentRoundDateRange,
  currentRoundNumber,
  isSaving,
  onCapacityChange,
  onClose,
  onCloseDateChange,
  onOpenDateChange,
  onRoundNumberChange,
  onStart,
  openDate,
  roundNumber,
}: {
  capacity: string;
  closeDate: string;
  currentCapacity: string;
  currentRoundDateRange: string;
  currentRoundNumber: number;
  isSaving: boolean;
  onCapacityChange: (value: string) => void;
  onClose: () => void;
  onCloseDateChange: (value: string) => void;
  onOpenDateChange: (value: string) => void;
  onRoundNumberChange: (value: string) => void;
  onStart: () => void;
  openDate: string;
  roundNumber: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <div className="grid gap-[22px]">
        <section className="grid gap-[12px] border-b border-[#6D7A8A] px-[8px] pb-[10px] text-[14px] leading-[1.253]">
          <h2 className="font-medium text-[#0D0D0C]">다음 기수 모집</h2>
          <div className="font-normal text-[#6D7A8A]">
            <p>이 프로그램 페이지를 그대로 유지하며 다음 기수를 오픈해요</p>
            <p>저장 등 기존 정보는 모두 이어지고, 다음 기수 알림 신청자에게</p>
            <p>오픈 알림이 발송돼요</p>
          </div>
          <div className="flex items-center gap-[6px]">
            <p className="shrink-0 font-medium text-[#0D0D0C]">현재 기수</p>
            <div className="flex min-w-0 items-center gap-[14px] px-[6px]">
              <span className="rounded-[14px] bg-[#F7B267] px-[16px] py-[3px] text-[12px] font-semibold leading-[1.253] text-[#FCFCFC]">
                {padDashboardCount(currentRoundNumber)} 기
              </span>
              <span className="text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
                {currentRoundDateRange}
              </span>
              <span className="text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
                정원 : {currentCapacity || "00명"}
              </span>
            </div>
          </div>
        </section>
        <DashboardModalField label="기수 넘버">
          <p className="text-[12px] font-medium leading-[1.253] text-[#6D7A8A]">
            프로그램 제목 옆 자동 입력 됩니다.
          </p>
          <DashboardUnitInput
            onChange={onRoundNumberChange}
            unit="기"
            value={roundNumber}
          />
        </DashboardModalField>
        <DashboardModalField label="오픈 예정일">
          <DashboardDateInput onChange={onOpenDateChange} value={openDate} />
        </DashboardModalField>
        <DashboardModalField label="마감 예정일">
          <DashboardRadioOption checked={false} label="모집 완료 시 자동 마감" onClick={() => undefined} />
          <DashboardRadioOption checked label="마감 날짜 직접 설정" onClick={() => undefined} />
          <DashboardDateInput onChange={onCloseDateChange} value={closeDate} />
        </DashboardModalField>
        <DashboardModalField label="모집 정원">
          <DashboardUnitInput onChange={onCapacityChange} unit="명" value={capacity} />
        </DashboardModalField>
        <p className="text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          일정, 장소 등 세부 내용은 재오픈 후 프로그램 설정에서 수정할 수 있어요
        </p>
        <DashboardModalButton disabled={isSaving} onClick={onStart} width="full">
          {isSaving ? "저장 중" : "다음 기수 시작"}
        </DashboardModalButton>
      </div>
    </ProgramDashboardModal>
  );
}

function DeleteProgramDialog({
  canDelete,
  isDeleting,
  onClose,
  onDelete,
  programTitle,
}: {
  canDelete: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: () => void;
  programTitle: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <h2 className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
        프로그램 삭제
      </h2>
      <p className="mt-[7px] text-[16px] font-semibold leading-[1.253] text-[#6D7A8A]">
        작성한 내용이 모두 영구 삭제가 돼요!
      </p>
      <p className="mt-[7px] text-[12px] font-medium leading-[1.253] text-[#DE1D1D]">
        {canDelete
          ? "삭제 후 복구가 불가능 해요."
          : `${programTitle}은 온보딩이 완료되어 빠른 삭제가 제한돼요.`}
      </p>
      <div className="pt-[14px]">
        <DashboardModalButton
          disabled={!canDelete || isDeleting}
          onClick={onDelete}
          width="full"
        >
          {isDeleting ? "삭제 중" : "삭제하기"}
        </DashboardModalButton>
      </div>
    </ProgramDashboardModal>
  );
}

function DashboardModalField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-[6px]">
      <span className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      {children}
    </label>
  );
}

function DashboardDateInput({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="relative w-[255px] rounded-[7px] border-[0.5px] border-[#F7B267] bg-[#F9F9F9]">
      <input
        className="h-[34px] w-full appearance-none rounded-[7px] bg-transparent px-[12px] pr-[42px] text-[12px] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] disabled:text-[#CAC4BC]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
      <CalendarDays
        aria-hidden="true"
        className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[#6D7A8A]"
        size={19}
        strokeWidth={1.8}
      />
    </div>
  );
}

function DashboardRadioOption({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex w-fit items-center gap-[6px] px-[6px] text-left text-[14px] font-medium leading-[1.253] text-[#6D7A8A]"
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid size-[14px] place-items-center rounded-full border ${
          checked ? "border-[#FE701E]" : "border-[#6D7A8A]"
        }`}
      >
        {checked ? <span className="size-[8px] rounded-full bg-[#FE701E]" /> : null}
      </span>
      {label}
    </button>
  );
}

function DashboardUnitInput({
  onChange,
  unit,
  value,
}: {
  onChange: (value: string) => void;
  unit: string;
  value: string;
}) {
  return (
    <div className="flex h-[34px] w-[105px] items-center rounded-[7px] border-[0.5px] border-[#F7B267] bg-[#F9F9F9] pl-[12px] pr-[6px] text-[12px] font-medium leading-[1.253]">
      <input
        className="min-w-0 flex-1 bg-transparent text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/gu, ""))}
        placeholder="0"
        value={value}
      />
      <span className="shrink-0 text-[#0D0D0C]">{unit}</span>
    </div>
  );
}

function DashboardModalButton({
  children,
  disabled = false,
  onClick,
  width,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  width: "compact" | "full";
}) {
  return (
    <button
      className={`inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#FE701E] pb-[5px] pl-[19px] pr-[18px] pt-[6px] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] disabled:cursor-not-allowed disabled:opacity-45 ${
        width === "full" ? "w-full" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ProgramDashboardModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/20 px-4 py-8"
      role="dialog"
    >
      <div className="w-[457px] max-w-[calc(100vw-32px)] rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[18px] py-[24px] shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
        <div className="flex justify-end">
          <button
            aria-label="닫기"
            className="inline-flex size-4 items-center justify-center text-[#0D0D0C]"
            onClick={onClose}
            type="button"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-[6px]">{children}</div>
      </div>
    </div>
  );
}

async function uploadProgramImage(
  file: File,
  programId: string,
  usage: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("programId", programId);
  formData.append("usage", usage);

  const response = await fetch("/api/host/program-assets", {
    body: formData,
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: { url?: string };
    error?: string;
  };

  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.error ?? "이미지를 업로드하지 못했어요.");
  }

  return payload.data.url;
}

function uniqueImages(images: string[]): string[] {
  return Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));
}

function AddressSearchField({
  address,
  addressDetail,
  label,
  onAddressChange,
  onAddressDetailChange,
}: {
  address: string;
  addressDetail: string;
  label?: string;
  onAddressChange: (value: string) => void;
  onAddressDetailChange: (value: string) => void;
}) {
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchLayerTick, setAddressSearchLayerTick] = useState(0);
  const [postcodeEmbedded, setPostcodeEmbedded] = useState(false);
  const addressSearchLayerRef = useRef<HTMLDivElement>(null);
  const detailAddressInputRef = useRef<HTMLInputElement>(null);
  const fallbackAddressOptions = useMemo(() => {
    const query = addressSearchQuery.trim();
    if (!query) return ADDRESS_FALLBACK_OPTIONS;

    return ADDRESS_FALLBACK_OPTIONS.filter((option) => option.includes(query));
  }, [addressSearchQuery]);

  useEffect(() => {
    if (!addressSearchOpen) return;

    const layer = addressSearchLayerRef.current;
    if (!layer) {
      const retryFrame = window.requestAnimationFrame(() => {
        setAddressSearchLayerTick((current) => current + 1);
      });

      return () => window.cancelAnimationFrame(retryFrame);
    }
    const postcodeLayer = layer;
    let active = true;

    async function embedAddressSearch() {
      setAddressSearchError("");
      setPostcodeEmbedded(false);

      try {
        await loadKakaoPostcodeScript();
        if (!active) return;

        const Postcode = getKakaoPostcodeConstructor();
        if (!Postcode) {
          throw new Error("주소 검색 서비스를 사용할 수 없습니다.");
        }

        postcodeLayer.innerHTML = "";
        new Postcode({
          height: "100%",
          maxSuggestItems: 5,
          oncomplete: (data: KakaoPostcodeData) => {
            onAddressChange(getSelectedKakaoAddress(data));
            onAddressDetailChange("");
            setAddressSearchOpen(false);
            window.setTimeout(() => detailAddressInputRef.current?.focus(), 0);
          },
          width: "100%",
        }).embed(postcodeLayer);
        setPostcodeEmbedded(true);
      } catch (error) {
        setAddressSearchError(
          error instanceof Error
            ? error.message
            : "주소 검색 서비스를 불러오지 못했어요.",
        );
      }
    }

    void embedAddressSearch();

    return () => {
      active = false;
      postcodeLayer.innerHTML = "";
    };
  }, [
    addressSearchLayerTick,
    addressSearchOpen,
    onAddressChange,
    onAddressDetailChange,
  ]);

  function selectAddress(nextAddress: string) {
    onAddressChange(nextAddress);
    onAddressDetailChange("");
    setAddressSearchOpen(false);
    window.setTimeout(() => detailAddressInputRef.current?.focus(), 0);
  }

  return (
    <div className="flex flex-col gap-[var(--figma-12)]">
      {label ? <SettingsFieldLabel>{label}</SettingsFieldLabel> : null}
      <div className="grid grid-cols-[minmax(0,var(--figma-462))_var(--figma-82)] gap-[var(--figma-8)]">
        <FigmaTextInput
          onChange={onAddressChange}
          placeholder="집결지 주소를 검색해주세요."
          value={address}
        />
        <button
          className="inline-flex h-[var(--figma-31)] items-center justify-center rounded-[var(--figma-7)] border border-[#6D7A8A] bg-white text-[length:var(--figma-12)] font-medium text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E]"
          onClick={() => {
            setAddressSearchError("");
            setPostcodeEmbedded(false);
            setAddressSearchOpen(true);
          }}
          type="button"
        >
          주소 검색
        </button>
      </div>
      <input
        className="h-[var(--figma-31)] w-full rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
        onChange={(event) => onAddressDetailChange(event.target.value)}
        placeholder="상세주소를 입력해주세요."
        ref={detailAddressInputRef}
        style={{ fontSize: "var(--figma-12)" }}
        type="text"
        value={addressDetail}
      />

      {addressSearchOpen ? (
        <AddressSearchDialog
          addressSearchError={addressSearchError}
          addressSearchQuery={addressSearchQuery}
          fallbackAddressOptions={fallbackAddressOptions}
          onClose={() => setAddressSearchOpen(false)}
          onQueryChange={setAddressSearchQuery}
          onSelectAddress={selectAddress}
          postcodeEmbedded={postcodeEmbedded}
          refElement={addressSearchLayerRef}
        />
      ) : null}
    </div>
  );
}

function AddressSearchDialog({
  addressSearchError,
  addressSearchQuery,
  fallbackAddressOptions,
  onClose,
  onQueryChange,
  onSelectAddress,
  postcodeEmbedded,
  refElement,
}: {
  addressSearchError: string;
  addressSearchQuery: string;
  fallbackAddressOptions: string[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSelectAddress: (value: string) => void;
  postcodeEmbedded: boolean;
  refElement: RefObject<HTMLDivElement | null>;
}) {
  const customAddress = addressSearchQuery.trim();

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/35 px-4 py-8"
      role="dialog"
    >
      <div className="w-full max-w-[620px] overflow-hidden rounded-md bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex h-[58px] items-center justify-between border-b border-[#eeeeee] px-6">
          <h2 className="text-lg font-black text-[#4B3328]">주소 검색</h2>
          <button
            className="inline-flex h-[34px] items-center rounded-md border border-[#d9d9d9] px-4 text-sm font-black text-[#748190] transition hover:border-[#FE701E] hover:text-[#FE701E]"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
        {addressSearchError ? null : (
          <div
            className={`w-full bg-white ${
              postcodeEmbedded ? "h-[520px]" : "h-[220px]"
            }`}
            ref={refElement}
          >
            <div className="grid h-full place-items-center text-sm font-bold text-[#8F7A6C]">
              주소 검색을 불러오는 중입니다.
            </div>
          </div>
        )}
        {!postcodeEmbedded || addressSearchError ? (
          <div className="grid max-h-[360px] gap-5 overflow-y-auto border-t border-[#eeeeee] px-6 py-6">
            <div className="grid gap-2">
              <input
                className="h-11 rounded-md border border-[#d9d9d9] px-4 text-sm font-bold text-[#4B3328] outline-none transition placeholder:text-[#9a8c84] focus:border-[#FE701E]"
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="도로명, 건물명, 지번을 입력하세요"
                value={addressSearchQuery}
              />
              <p className="text-sm font-bold leading-6 text-[#8F7A6C]">
                Kakao 주소 검색이 열리지 않으면 아래에서 주소를 선택하거나 직접
                입력하세요.
              </p>
            </div>
            <div className="grid gap-2">
              {fallbackAddressOptions.length > 0 ? (
                fallbackAddressOptions.map((address) => (
                  <button
                    className="rounded-md border border-[#eeeeee] px-4 py-3 text-left text-sm font-bold text-[#4B3328] transition hover:border-[#FE701E] hover:text-[#FE701E]"
                    key={address}
                    onClick={() => onSelectAddress(address)}
                    type="button"
                  >
                    {address}
                  </button>
                ))
              ) : customAddress ? (
                <button
                  className="rounded-md border border-[#FE701E] px-4 py-3 text-left text-sm font-black text-[#FE701E]"
                  onClick={() => onSelectAddress(customAddress)}
                  type="button"
                >
                  입력한 주소 사용: {customAddress}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="ml-auto flex h-[var(--figma-20)] flex-1 items-center justify-end gap-[var(--figma-8)] border-0 bg-transparent p-0 text-left"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
        {label}
      </span>
      <span
        className={`relative h-[var(--figma-14)] w-[var(--figma-23)] rounded-full transition ${
          checked ? "bg-[#FE701E]" : "bg-[#6D7A8A]"
        }`}
      >
        <span
          className={`absolute top-1/2 size-[var(--figma-10)] -translate-y-1/2 rounded-full bg-white transition ${
            checked ? "right-[var(--figma-2)]" : "left-[var(--figma-2)]"
          }`}
        />
      </span>
    </button>
  );
}

function findProgramDraft(
  drafts: HostProgramDraft[],
  programId: string,
  program?: HostProgramOverview,
): HostProgramDraft | undefined {
  const ids = new Set(
    [programId, program?.id, program?.slug, program ? hostProgramId(program.title) : ""]
      .filter(Boolean)
      .map((value) => String(value)),
  );

  return drafts.find((draft) => {
    const draftIds = [
      draft.id,
      draft.slug ?? "",
      hostProgramId(draft.title),
    ];
    return draftIds.some((id) => ids.has(id));
  });
}

function isLinkedApplicationForm(
  form: ApplicationFormTemplate,
  draft: HostProgramDraft,
): boolean {
  return (
    form.formKind === "application" &&
    (Boolean(form.programId && form.programId === draft.id) ||
      normalizeIdentifier(form.programTitle) === normalizeIdentifier(draft.title))
  );
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d]/gu, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function extractCapacityCount(value: string): number {
  return parsePositiveInteger(value);
}

function formatCapacityCount(value: number): string {
  return value > 0 ? `${value}명` : "0명";
}

function stripRoundSuffix(value: string): string {
  return value.replace(/\s*\d+\s*기$/u, "").trim();
}

function extractRoundNumber(value: string): number {
  const match = value.match(/(\d+)\s*기$/u);
  return match ? Number(match[1]) : 0;
}

function padDashboardCount(value: number | string): string {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(numericValue)) return "00";
  return numericValue.toString().padStart(2, "0");
}

function formatDashboardDate(value?: string): string {
  if (!value) return "0000년 00월 00일";

  const parts = getDateParts(value);
  if (!parts) return value;

  return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
}

function formatDashboardDateRange(start?: string, end?: string): string {
  if (!start && !end) return "0000년 00월 00일 - 00월 00일";

  const startParts = start ? getDateParts(start) : undefined;
  const endParts = end ? getDateParts(end) : undefined;

  if (startParts && endParts && startParts.year === endParts.year) {
    return `${startParts.year}년 ${startParts.month}월 ${startParts.day}일 - ${endParts.month}월 ${endParts.day}일`;
  }

  return `${formatDashboardDate(start)} - ${formatDashboardDate(end)}`;
}

function countDateDays(start?: string, end?: string): number {
  if (!start || !end) return 0;

  const startDate = new Date(`${start}T00:00:00+09:00`);
  const endDate = new Date(`${end}T00:00:00+09:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
  );
}

function getDashboardDday(targetDate: string, status: ProgramStatus): string {
  if (status === "closed") return "마감";
  if (status === "earlyClosed") return "조기마감";

  const target = new Date(`${targetDate}T00:00:00+09:00`);
  if (Number.isNaN(target.getTime())) return "D - 00";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return "D-Day";
  return `D - ${diff.toString().padStart(2, "0")}`;
}

function formatProgramNumber(programId: string): string {
  return formatProgramDisplayCode(programId);
}

function formatProgramPeriod(start: string, end: string): string {
  const startParts = getDateParts(start);
  const endParts = getDateParts(end);
  const startDate = startParts ? formatShortDateParts(startParts) : start.trim();
  const endDate = endParts ? formatShortDateParts(endParts) : end.trim();

  if (startParts && endParts && startParts.year === endParts.year) {
    return `${startDate}-${endParts.month}.${endParts.day}`;
  }

  if (startDate && endDate) return `${startDate}-${endDate}`;
  return startDate || endDate || "일정 미정";
}

function formatKoreanDate(value: string): string {
  const parts = getDateParts(value);
  return parts ? `${parts.year}년 ${parts.month}월 ${parts.day}일` : "마감일 미정";
}

function getDateParts(value: string):
  | { day: number; month: number; year: string }
  | undefined {
  const normalizedDate = normalizeDateInput(value);
  const match = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  if (!match) return undefined;

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: match[1],
  };
}

function formatShortDateParts(parts: { day: number; month: number; year: string }): string {
  return `${parts.year}.${parts.month}.${parts.day}`;
}

function normalizePanel(value: string | null): ProgramPanel {
  const managementEnabled =
    launchFeatureFlags.coupons || launchFeatureFlags.promotions;

  if (
    value === "basic" ||
    value === "detail" ||
    value === "schedule" ||
    value === "place" ||
    value === "guide" ||
    (managementEnabled && value === "management") ||
    value === "delete"
  ) {
    return value;
  }

  return "dashboard";
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getProgramDashboardState(
  status: ProgramStatus | undefined,
  readyToPublish: boolean,
): ProgramDashboardState {
  if (!readyToPublish) return "creating";
  if (status === "closed" || status === "earlyClosed") return "ended";
  if (status === "open") return "open";
  return "upcoming";
}

function getDashboardStateMeta(state: ProgramDashboardState): {
  badgeClassName: string;
  description: string;
  label: string;
} {
  if (state === "creating") {
    return {
      badgeClassName: "bg-[#7A8B52] text-[#F3F3F3]",
      description:
        "필수 온보딩 항목을 작성하는 단계입니다. 모든 항목이 완료되면 오픈 예약을 진행할 수 있습니다.",
      label: "프로그램 작성중",
    };
  }

  if (state === "open") {
    return {
      badgeClassName: "bg-[#F7B267] text-white",
      description:
        "현재 모집이 진행 중입니다. 신청 현황, 메시지, 운영 설정을 확인하며 프로그램을 관리하세요.",
      label: "모집중",
    };
  }

  if (state === "ended") {
    return {
      badgeClassName: "bg-[#C75C36] text-white",
      description:
        "모집 또는 운영이 종료된 프로그램입니다. 신청 기록과 메시지 내역을 중심으로 확인할 수 있습니다.",
      label: "종료",
    };
  }

  return {
    badgeClassName: "bg-[#6D7A8A] text-white",
    description:
      "오픈 예약이 준비된 프로그램입니다. 예약일과 공개 설정을 확인한 뒤 모집을 시작할 수 있습니다.",
    label: "모집예정",
  };
}

function buildDashboardOnboardingSteps(
  checklist: ProgramDraftChecklistItem[],
  draft: HostProgramDraft | undefined,
  programPath: string,
  formsHref: string,
): DashboardOnboardingStep[] {
  const checklistById = new Map(checklist.map((item) => [item.id, item]));
  const orderedIds = [
    "basic",
    "detail",
    "schedule",
    "place",
    "operation",
    "application-form",
  ];

  return orderedIds
    .map((id) => {
      const item = checklistById.get(id) ?? getVirtualChecklistItem(id, draft);
      if (!item) return null;

      return {
        done: item.done,
        helper: item.helper,
        href: getChecklistHref(item.id, programPath, formsHref),
        id: item.id,
        label: item.label,
      };
    })
    .filter((item): item is DashboardOnboardingStep => Boolean(item));
}

function getVirtualChecklistItem(
  id: string,
  draft: HostProgramDraft | undefined,
): ProgramDraftChecklistItem | null {
  if (id !== "schedule") return null;

  const itineraryDone = Boolean(
    draft?.itineraryDays.some(
      (day) =>
        day.summary.trim().length > 0 ||
        day.timetable.trim().length > 0 ||
        day.images.length > 0 ||
        day.image.trim().length > 0,
    ),
  );

  return {
    done: itineraryDone,
    helper: "일차별 일정, 타임테이블, 일정 사진 중 하나 이상을 작성해야 합니다.",
    id: "schedule",
    label: "일정안내",
  };
}

function getChecklistHref(
  itemId: string,
  programPath: string,
  formsHref: string,
): string {
  if (itemId === "application-form") return formsHref || `${programPath}?panel=dashboard`;
  if (itemId === "detail") return `${programPath}?panel=detail`;
  if (itemId === "place") return `${programPath}?panel=place`;
  if (itemId === "schedule") return `${programPath}?panel=schedule`;
  if (itemId === "operation") return `${programPath}?panel=guide`;
  return `${programPath}?panel=basic`;
}

function buildInternalApplyUrl(draft: HostProgramDraft): string {
  const programKey = draft.slug || draft.id;
  return `/programs/${programKey}/apply`;
}

function getBasicApplicationMethod(applyUrl: string): BasicApplicationMethod {
  const url = applyUrl.trim();

  if (url === lotteryApplicationApplyUrl) return "lottery";
  if (url === hostScreeningApplyUrl) return "host";

  return "open";
}

function getUnitInputValue(value: string, unit: "명" | "원"): string {
  return value.trim().replace(new RegExp(`\\s*${unit}$`, "u"), "");
}

function toUnitDraftValue(value: string, unit: "명" | "원"): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  if (trimmedValue.endsWith(unit)) return trimmedValue;
  if (/^[\d,]+$/u.test(trimmedValue)) return `${trimmedValue}${unit}`;
  return trimmedValue;
}

function getPriceMode(fee: string): PriceMode {
  const normalizedFee = fee.trim();

  if (!normalizedFee || normalizedFee === "무료") return "free";
  if (normalizedFee === "미정" || normalizedFee === "가격 미정" || normalizedFee === "TBD") {
    return "undecided";
  }

  return "paid";
}

function normalizeDateInput(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dottedMatch = trimmedValue.match(/^(\d{4})[.](\d{1,2})[.](\d{1,2})/u);
  if (dottedMatch) {
    return [
      dottedMatch[1],
      dottedMatch[2].padStart(2, "0"),
      dottedMatch[3].padStart(2, "0"),
    ].join("-");
  }

  return trimmedValue;
}

function loadKakaoPostcodeScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 주소 검색을 사용할 수 있습니다."));
  }

  if (getKakaoPostcodeConstructor()) {
    return Promise.resolve();
  }

  if (!kakaoPostcodeScriptPromise) {
    kakaoPostcodeScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-kakao-postcode="true"], script[src*="/postcode/prod/postcode.v2.js"]',
      );

      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          waitForKakaoPostcodeConstructor().then(resolve).catch(reject);
          return;
        }

        existingScript.addEventListener(
          "load",
          () => waitForKakaoPostcodeConstructor().then(resolve).catch(reject),
          { once: true },
        );
        existingScript.addEventListener(
          "error",
          () => {
            kakaoPostcodeScriptPromise = null;
            reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
          },
          { once: true },
        );
        return;
      }

      const tryLoad = (sources: string[], index = 0) => {
        const source = sources[index];
        if (!source) {
          kakaoPostcodeScriptPromise = null;
          reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
          return;
        }

        const script = document.createElement("script");
        const timer = window.setTimeout(() => {
          script.remove();
          tryLoad(sources, index + 1);
        }, 5000);

        script.async = true;
        script.dataset.kakaoPostcode = "true";
        script.src = source;
        script.onload = () => {
          window.clearTimeout(timer);
          script.dataset.loaded = "true";
          waitForKakaoPostcodeConstructor().then(resolve).catch(() => {
            script.remove();
            tryLoad(sources, index + 1);
          });
        };
        script.onerror = () => {
          window.clearTimeout(timer);
          script.remove();
          tryLoad(sources, index + 1);
        };
        document.head.appendChild(script);
      };

      tryLoad([KAKAO_POSTCODE_SCRIPT_SRC, DAUM_POSTCODE_SCRIPT_SRC]);
    });
  }

  return kakaoPostcodeScriptPromise;
}

function getKakaoPostcodeConstructor() {
  return window.kakao?.Postcode ?? window.daum?.Postcode;
}

function waitForKakaoPostcodeConstructor(timeoutMs = 3000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (getKakaoPostcodeConstructor()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
        return;
      }

      window.setTimeout(checkReady, 50);
    };

    checkReady();
  });
}

function getSelectedKakaoAddress(data: KakaoPostcodeData) {
  const baseAddress =
    data.userSelectedType === "R"
      ? data.roadAddress || data.address
      : data.jibunAddress || data.address;

  if (data.userSelectedType !== "R") {
    return baseAddress;
  }

  const extraParts = [
    data.bname && /[동로가]$/.test(data.bname) ? data.bname : "",
    data.buildingName && data.apartment === "Y" ? data.buildingName : "",
  ].filter(Boolean);

  return extraParts.length > 0
    ? `${baseAddress} (${extraParts.join(", ")})`
    : baseAddress;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장 전";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
