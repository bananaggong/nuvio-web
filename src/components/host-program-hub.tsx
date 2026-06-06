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
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Plus,
  Redo2,
  Search,
  Settings,
  Trash2,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
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
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
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

const panelLabels: Record<ProgramPanel, string> = {
  basic: "기본정보",
  dashboard: "대시보드",
  delete: "프로그램 삭제",
  detail: "상세 정보",
  guide: "안내사항",
  management: "프로그램 관리",
  place: "장소 정보",
  schedule: "일정 안내",
};

const statusOptions: Array<{ label: string; value: ProgramStatus }> = [
  { label: "모집예정", value: "upcoming" },
  { label: "모집중", value: "open" },
  { label: "마감", value: "closed" },
  { label: "조기마감", value: "earlyClosed" },
];

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
type ProgramDashboardDialog = "delete" | "onboarding-required" | "open-schedule" | null;

const figmaScaleStyle = {
  "--figma-scale":
    "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--figma-4": "clamp(4px, 0.278vw, 5.333px)",
  "--figma-6": "clamp(6px, 0.417vw, 8px)",
  "--figma-7": "clamp(7px, 0.486vw, 9.333px)",
  "--figma-8": "clamp(8px, 0.556vw, 10.667px)",
  "--figma-10": "clamp(10px, 0.694vw, 13.333px)",
  "--figma-12": "clamp(12px, 0.833vw, 16px)",
  "--figma-14": "clamp(14px, 0.972vw, 18.667px)",
  "--figma-16": "clamp(16px, 1.111vw, 21.333px)",
  "--figma-21": "clamp(21px, 1.458vw, 28px)",
  "--figma-22": "clamp(22px, 1.528vw, 29.333px)",
  "--figma-23": "clamp(23px, 1.597vw, 30.667px)",
  "--figma-24": "clamp(24px, 1.667vw, 32px)",
  "--figma-28": "clamp(28px, 1.944vw, 37.333px)",
  "--figma-30": "clamp(30px, 2.083vw, 40px)",
  "--figma-31": "clamp(31px, 2.153vw, 41.333px)",
  "--figma-32": "clamp(32px, 2.222vw, 42.667px)",
  "--figma-35": "clamp(35px, 2.431vw, 46.667px)",
  "--figma-44": "clamp(44px, 3.056vw, 58.667px)",
  "--figma-50": "clamp(50px, 3.472vw, 66.667px)",
} as CSSProperties;

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

  const activePanel = normalizePanel(searchParams.get("panel"));
  const project = useMemo(
    () =>
      projectId
        ? findHostProjectOverview(projectId, applications, reportProjects, hostPrograms)
        : undefined,
    [applications, hostPrograms, projectId, reportProjects],
  );
  const program = useMemo(
    () =>
      projectId
        ? findHostProgramOverview(
            projectId,
            programId,
            applications,
            reportProjects,
            hostPrograms,
          )
        : findStandaloneHostProgramOverview(
            programId,
            applications,
            reportProjects,
            hostPrograms,
          ),
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

  if ((projectId && !project) || !program) {
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
        status: "upcoming",
        updatedAt: new Date().toISOString(),
      },
      "오픈 예약이 저장되었습니다.",
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
  const showPreviewRail = false;
  const dashboardPanelActive = activePanel === "dashboard";

  function openScheduleDialog() {
    if (!readyToPublish) {
      setDashboardDialog("onboarding-required");
      return;
    }

    setScheduledOpenDate(draft?.recruitStart || new Date().toISOString().slice(0, 10));
    setDashboardDialog("open-schedule");
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#33241C]"
      style={figmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <ProgramBuilderSidebar
          activePanel={activePanel}
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          programId={program.id}
          programPath={programPath}
          status={
            dashboardState === "creating"
              ? "프로그램 작성중"
              : statusLabel(draft?.status ?? program.status)
          }
          title={draft?.title || program.title}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          {!dashboardPanelActive && !embeddedPreviewPanel ? (
          <div className="ml-[2.778vw] flex h-[5.972vw] min-h-[86px] w-[64.236vw] max-w-[1233px] items-end justify-end pb-[1.25vw] text-[16px] font-normal leading-[1.253] text-[#6D7A8A]">
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
              {!dashboardPanelActive && !embeddedPreviewPanel ? (
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
                    draft={draft}
                    isDeleting={isDeleting}
                    onDelete={() => void deleteProgram({ allowCompleted: true })}
                    readyToPublish={readyToPublish}
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
              onDelete={() => setDashboardDialog("delete")}
              onOpenSchedule={openScheduleDialog}
            />
          ) : (
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
          isSaving={isSaving}
          onClose={() => setDashboardDialog(null)}
          onSchedule={() => void scheduleProgramOpen()}
          onScheduledDateChange={setScheduledOpenDate}
          scheduledDate={scheduledOpenDate}
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

type ProgramBuilderSidebarProps = {
  activePanel: ProgramPanel;
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  programId: string;
  programPath: string;
  status: string;
  title: string;
};

function ProgramBuilderSidebar({
  activePanel,
  applicationsHref,
  formsHref,
  messagesHref,
  programId,
  programPath,
  status,
  title,
}: ProgramBuilderSidebarProps) {
  const settingsPanels = new Set<ProgramPanel>([
    "basic",
    "detail",
    "schedule",
    "place",
    "guide",
  ]);
  const settingsActive = settingsPanels.has(activePanel);

  return (
    <aside
      className="w-[15.833vw] min-w-[228px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] max-md:w-full"
      style={figmaScaleStyle}
    >
      <div className="flex h-full flex-col gap-[0.833vw] px-[0.417vw] max-md:px-5">
        <section className="flex w-full flex-col gap-[0.278vw]">
          <div className="flex w-full items-center justify-center px-[0.833vw] pt-[0.833vw]">
            <p className="min-w-0 flex-1 text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
              {title || "프로그램 제목"}
            </p>
            <span className="shrink-0 rounded-[6px] bg-[#7A8B52] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] text-[#F3F3F3]">
              {status}
            </span>
          </div>
          <div className="flex w-full items-center justify-center border-b border-[#D9D9D9] pb-[0.556vw] pt-[0.139vw]">
            <p className="h-[18px] w-[13.333vw] min-w-[192px] text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
              프로그램 넘버 :{" "}
              <span className="text-[#FE701E]">{formatProgramNumber(programId)}</span>
            </p>
          </div>
        </section>

        <nav className="flex w-full flex-col gap-[0.903vw] px-[0.833vw] text-[#5B3A29]">
          <section className="flex flex-col gap-[0.417vw]">
            <Link
              className={`text-[14px] leading-[1.253] ${
                activePanel === "dashboard" ? "font-semibold" : "font-normal"
              }`}
              href={`${programPath}?panel=dashboard`}
            >
              대시보드
            </Link>
            <p className="text-[14px] font-normal leading-[1.253]">
              <span className={settingsActive ? "font-semibold" : "font-normal"}>
                프로그램 설정
              </span>
            </p>
            <div className="flex flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
              <ProgramSidebarTextLink
                active={activePanel === "basic"}
                href={`${programPath}?panel=basic`}
                label="기본정보"
              />
              <ProgramSidebarTextLink
                active={activePanel === "detail"}
                href={`${programPath}?panel=detail`}
                label="상세정보"
              />
              <ProgramSidebarTextLink
                active={activePanel === "schedule"}
                href={`${programPath}?panel=schedule`}
                label="일정안내"
              />
              <ProgramSidebarTextLink
                active={activePanel === "place"}
                href={`${programPath}?panel=place`}
                label="장소안내"
              />
              <ProgramSidebarTextLink
                active={activePanel === "guide"}
                href={`${programPath}?panel=guide`}
                label="안내사항"
              />
            </div>
          </section>

          <section className="flex flex-col gap-[0.417vw]">
            <p className="text-[14px] font-normal leading-[1.253]">
              신청폼 현황
            </p>
            <div className="flex flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
              <ProgramSidebarTextLink href={formsHref} label="신청폼 연결" />
              <ProgramSidebarTextLink href={applicationsHref} label="신청 관리" />
              <ProgramSidebarTextLink href={messagesHref} label="결과 메세지 관리" />
            </div>
          </section>

          <Link className="text-[14px] font-normal leading-[1.253]" href={`${programPath}?panel=management`}>
            쿠폰 / 프로모션
          </Link>
          <Link className="text-[14px] font-normal leading-[1.253]" href={messagesHref}>
            문의
          </Link>
          <Link className="text-[14px] font-normal leading-[1.253]" href={`${applicationsHref}?panel=receipts`}>
            결제 관리
          </Link>
          <Link className="text-[14px] font-normal leading-[1.253]" href={`${applicationsHref}?panel=reviews`}>
            후기 관리
          </Link>
          <Link className="text-[14px] font-normal leading-[1.253]" href={`${programPath}?panel=delete`}>
            프로그램 삭제
          </Link>
        </nav>
      </div>
    </aside>
  );
}

function ProgramSidebarTextLink({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`w-fit rounded-[4px] px-[0.556vw] py-[0.139vw] text-[12px] leading-[1.253] ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29]"
      }`}
      href={href}
    >
      {label}
    </Link>
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
  publishChecklist,
  program,
  programPath,
}: {
  dashboardState: ProgramDashboardState;
  draft?: HostProgramDraft;
  formsHref: string;
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
            프로그램 넘버 : {formatProgramNumber(program.id)}
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
      <div className="w-[64.236vw] max-w-[1233px]">
        <SettingsFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>프로그램 명</SettingsFieldLabel>
            <FigmaTextInput
              onChange={(title) => updateDraft({ title })}
              placeholder="프로그램 이름을 입력해주세요."
              value={draft.title}
            />
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock>
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

        <SettingsFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>모집인원</SettingsFieldLabel>
            <div className="flex items-center gap-[var(--figma-8)]">
              <FigmaTextInput
                className="w-[21.944vw] max-w-[421px]"
                inputMode="numeric"
                onChange={(capacity) => updateDraft({ capacity })}
                placeholder="00."
                value={draft.capacity}
              />
              <span className="text-[length:var(--figma-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                명
              </span>
            </div>
          </div>
        </SettingsFormBlock>

        <SettingsFormBlock>
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

        <SettingsFormBlock>
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
                    onChange={(fee) => updateDraft({ fee })}
                    placeholder="00."
                    value={priceMode === "paid" ? draft.fee : ""}
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
  return (
    <label className="relative block w-[17.708vw] max-w-[340px]">
      <span className="sr-only">{label}</span>
      <input
        className="h-[var(--figma-31)] w-full rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        style={{ fontSize: "var(--figma-12)" }}
        type="date"
        value={value}
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
        <div className="flex h-[6.667vw] max-h-[128px] items-start justify-end pt-[3.056vw] text-[length:var(--figma-16)] font-normal leading-[1.253] text-[#6D7A8A]">
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
                  heightClass="h-[12.778vw] max-h-[245px]"
                  image={draft.image}
                  label="썸네일"
                  onChange={(image) => updateDraft({ image })}
                  programId={draft.id}
                  usage="thumbnail"
                  widthClass="w-[8.472vw] max-w-[163px]"
                />
                <DetailImageUploadSlot
                  heightClass="h-[12.778vw] max-h-[245px]"
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
              <textarea
                className="h-[var(--figma-50)] resize-none rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] py-[var(--figma-8)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                maxLength={60}
                onChange={(event) => updateDraft({ summary: event.target.value })}
                placeholder="프로그램을 한눈에 설명하는 짧은 소개글을 작성해 주세요"
                style={{ fontSize: "var(--figma-12)" }}
                value={draft.summary}
              />
              <p className="text-right text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#D9D9D9]">
                {draft.summary.length} / 60
              </p>
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
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex w-full border-b border-[#6D7A8A] px-[var(--figma-22)] py-[var(--figma-24)] ${className}`}
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

function DetailPreviewRail({ draft }: { draft: HostProgramDraft }) {
  const [collapsed, setCollapsed] = useState({
    detail: false,
    thumbnail: false,
  });
  const previewProgram = useMemo(() => mapHostDraftToPreviewProgram(draft), [draft]);

  return (
    <aside className="min-h-[120.962vw] w-[47.442%] max-w-[741px] shrink-0 border-l border-[#6D7A8A] bg-white max-lg:w-full max-lg:max-w-none">
      <p className="pt-[var(--figma-44)] text-center text-[length:var(--figma-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        미리보기
      </p>
      <div className="mt-[var(--figma-21)] grid gap-[1.667vw] px-[0.764vw]">
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
    <div className="flex min-h-[29.216vw] items-center justify-center gap-[1.389vw] px-[1.25vw] py-[1.667vw]">
      <article className="w-[13.403vw] min-w-[192px] max-w-[257px] overflow-hidden">
        <div
          aria-label={`${program.title} 썸네일 이미지`}
          className="aspect-[0.79] w-full overflow-hidden rounded-[6px] bg-[#D9D9D9] bg-cover bg-center shadow-sm ring-1 ring-[#E6D6CA]"
          role="img"
          style={mainImageStyle}
        />
        <div className="mt-[10px] flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-[12px] font-bold leading-[1.25] text-[#2B1E17]">
            {program.title}
          </h3>
          <strong className="shrink-0 text-[12px] font-bold leading-[1.25] text-[#2B1E17]">
            {deadline}
          </strong>
        </div>
        <div className="mt-[8px] grid gap-[5px] text-[8px] font-medium leading-[1.35] text-[#6D7A8A]">
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
        <p className="mt-[8px] truncate text-[7px] font-medium leading-[1.3] text-[#6D7A8A]">
          {location || "프로그램 지역 위치"}
        </p>
        <h4 className="mt-[5px] line-clamp-2 text-[9px] font-bold leading-[1.28] text-[#5B3A29]">
          {program.title}
        </h4>
        <p className="mt-[6px] line-clamp-3 text-[7px] font-normal leading-[1.45] text-[#C9C4BD]">
          {summary}
        </p>
        <p className="mt-[8px] truncate text-[7px] font-medium leading-[1.3] text-[#6D7A8A]">
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
              <span className="h-[27px] text-[#CAC4BC]">후기</span>
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
const detailPreviewCanvasHeight = 2050;
const detailPreviewViewportHeight = "clamp(520px, 36vw, 690px)";

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
  const image = draft.image.trim() || previewFallbackImage;
  const hashtags = draft.hashtags.map((tag) => tag.trim().replace(/^#/u, "")).filter(Boolean);
  const itineraryImages = uniqueImages(
    draft.itineraryDays.flatMap((day) => [day.image, ...day.images]),
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
    gallery: uniqueImages([image, ...draft.detailImages, ...itineraryImages]),
    guideInfo: draft.guideInfo,
    hashtags,
    id: draft.id,
    image,
    itineraryDays: draft.itineraryDays,
    periodKey: draft.periodKey,
    phone: draft.phone.trim() || "000-0000-0000",
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

const previewFallbackImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80";

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
      <div className="flex flex-col gap-[var(--figma-21)]">
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
        <div className="flex flex-col items-center gap-[var(--figma-8)] py-[var(--figma-8)]">
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
      <DetailPreviewRail draft={draft} />
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
    <DetailFormBlock className={expanded ? "" : "py-[var(--figma-14)]"}>
      <div className="flex w-full flex-col">
        <button
          aria-expanded={expanded}
          className="flex h-[var(--figma-35)] w-full items-center justify-between rounded-[var(--figma-7)] bg-[#6D7A8A] px-[var(--figma-12)] text-left text-[#F9F9F9]"
          onClick={onToggle}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-[var(--figma-14)]">
            <span className="text-[length:var(--figma-14)] font-semibold leading-[1.253]">
              {dayNumber}일차
            </span>
            <span className="truncate text-[length:var(--figma-12)] font-medium leading-[1.253]">
              타임 테이블 ({timeTableCount.toString().padStart(2, "0")}개)
            </span>
          </span>
          <Image
            alt=""
            aria-hidden="true"
            className="size-[var(--figma-16)] shrink-0 brightness-0 invert"
            height={16}
            src={toggleIcon}
            width={16}
          />
        </button>

        {expanded ? (
          <div className="px-[var(--figma-14)] pt-[var(--figma-10)]">
            <p className="text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#6D7A8A]">
              JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드 할 수 있어요
            </p>
            <p className="mt-[var(--figma-8)] text-[length:var(--figma-12)] font-medium leading-[1.253] text-[#6D7A8A]">
              활동 사진 (최대 5장)
            </p>
            <SchedulePhotoSlots
              day={day}
              onChange={onChange}
              programId={programId}
            />

            <p className="mt-[var(--figma-10)] text-[length:var(--figma-12)] font-semibold leading-[1.253] text-[#7A8B52]">
              해당 일차의 활동이나 장소가 담긴 사진을 올려주세요
            </p>

            <div className="mt-[var(--figma-21)] flex flex-col gap-[var(--figma-10)]">
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
                    className="flex items-center gap-[var(--figma-6)]"
                    key={`${index}-${timetableRows.length}`}
                  >
                    <input
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 선택`}
                      className="size-[var(--figma-10)] shrink-0 rounded-[2px] border border-[#AEB8C2] accent-[#FE701E]"
                      type="checkbox"
                    />
                    <input
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 시간`}
                      className="h-[var(--figma-24)] w-[3.056vw] min-w-[44px] max-w-[59px] rounded-[var(--figma-7)] border-[0.5px] border-[#D9D9D9] bg-white px-[var(--figma-4)] text-center text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
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
                      className="h-[var(--figma-24)] min-w-0 flex-1 rounded-[var(--figma-7)] border-[0.5px] border-[#D9D9D9] bg-white px-[var(--figma-8)] text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                      onChange={(event) =>
                        updateTimetableRow(index, { text: event.target.value })
                      }
                      placeholder="일정을 간단하게 작성해주세요"
                      value={row.text}
                    />
                    <button
                      aria-label={`${dayNumber}일차 ${index + 1}번째 일정 삭제`}
                      className="grid size-[var(--figma-10)] shrink-0 place-items-center rounded-full bg-[#CAC4BC] text-white transition hover:bg-[#AEB8C2] disabled:cursor-not-allowed disabled:opacity-40"
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
      const match = line.match(/^(\d{1,2})\s*:\s*(\d{2})(?:\s+(.+))?$/u);
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
    <div className="mt-[var(--figma-8)] flex gap-[var(--figma-10)]">
      {Array.from({ length: 5 }).map((_, index) => {
        const image = images[index] ?? "";
        return (
          <label
            className="flex h-[5.347vw] min-h-[77px] max-h-[103px] w-[5.347vw] min-w-[77px] max-w-[103px] cursor-pointer flex-col items-center justify-center gap-[var(--figma-6)] rounded-[var(--figma-7)] border border-dashed border-[#F7B267] bg-[#F9F9F9] bg-cover bg-center text-[length:var(--figma-10)] font-medium leading-[1.253] text-[#D9D9D9] transition hover:border-[#FE701E] hover:text-[#FE701E]"
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

  return (
    <SettingsPreviewLayout draft={draft} updatedAt={updatedAt}>
      <div className="flex flex-col gap-[2.222vw]">
        <DetailFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-14)]">
            <SettingsFieldLabel>프로그램 지역</SettingsFieldLabel>
            <div className="grid grid-cols-2 gap-[var(--figma-22)]">
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

        <DetailFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-24)]">
            <SettingsFieldLabel>집결지 안내</SettingsFieldLabel>
            <AddressSearchField
              address={draft.placeInfo.meetingAddress}
              addressDetail={draft.placeInfo.meetingAddressDetail}
              onAddressChange={(meetingAddress) => updatePlaceInfo({ meetingAddress })}
              onAddressDetailChange={(meetingAddressDetail) =>
                updatePlaceInfo({ meetingAddressDetail })
              }
            />
            <MapPreviewBox address={draft.placeInfo.meetingAddress} />
            <FigmaTextarea
              onChange={(meetingMemo) => updatePlaceInfo({ meetingMemo })}
              placeholder="예 : 00옆 00출구 앞 , 담당자 피켓 확인 장소 등"
              title="집결지 추가 안내 사항 (선택)"
              value={draft.placeInfo.meetingMemo}
            />
            <div className="grid grid-cols-2 gap-[var(--figma-22)]">
              <FigmaTextInput
                onChange={(phone) => updateDraft({ phone })}
                placeholder="전화번호"
                value={draft.phone}
              />
              <FigmaTextInput
                onChange={(sourceUrl) => updateDraft({ sourceUrl })}
                placeholder="이메일 또는 문의 URL"
                value={draft.sourceUrl}
              />
            </div>
            <FigmaTextarea
              onChange={(parkingGuide) => updatePlaceInfo({ parkingGuide })}
              placeholder="예 : 전용 주차장 주소, 인근 공영 주차장 주소, 행사장 내 주차 불가 안내 등"
              title="주차 안내"
              value={draft.placeInfo.parkingGuide}
            />
            <FigmaTextarea
              description="자차 없이 도착할 수 있는 대중교통 방법을 안내해주세요"
              onChange={(transportGuide) => updatePlaceInfo({ transportGuide })}
              placeholder="예 : 집결지 인근 정류장 과 버스 노선 , 지하철 후 오시는 길 등"
              title="교통 안내"
              value={draft.placeInfo.transportGuide}
            />
          </div>
        </DetailFormBlock>

        <DetailFormBlock>
          <div className="flex w-full flex-col gap-[var(--figma-24)]">
            <div className="flex items-center gap-[var(--figma-12)]">
              <SettingsFieldLabel>숙소 안내</SettingsFieldLabel>
              <ToggleRow
                checked={draft.placeInfo.accommodationEnabled}
                label="숙소여부"
                onChange={(accommodationEnabled) =>
                  updatePlaceInfo({ accommodationEnabled })
                }
              />
            </div>
            {draft.placeInfo.accommodationEnabled ? (
              <>
                <FigmaTextInput
                  onChange={(accommodationName) =>
                    updatePlaceInfo({ accommodationName })
                  }
                  placeholder="숙소 이름 또는 주소를 입력해주세요"
                  value={draft.placeInfo.accommodationName}
                />
                <MapPreviewBox address={draft.placeInfo.accommodationName} />
                <FigmaTextarea
                  description="숙소에 대해 추가 안내사항이 있다면 입력해주세요"
                  onChange={(accommodationMemo) =>
                    updatePlaceInfo({ accommodationMemo })
                  }
                  placeholder="예 : 체크인 시간, 준비물, 방 배정 방식 등"
                  title="숙소 추가 안내 사항 (선택)"
                  value={draft.placeInfo.accommodationMemo}
                />
              </>
            ) : (
              <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
                집결지와 동일한 장소예요
              </p>
            )}
          </div>
        </DetailFormBlock>
      </div>
    </SettingsPreviewLayout>
  );
}

function FigmaTextarea({
  description,
  onChange,
  placeholder,
  title,
  value,
}: {
  description?: string;
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
        className="h-[var(--figma-50)] resize-none rounded-[var(--figma-7)] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--figma-12)] py-[var(--figma-8)] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
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
    <div className="grid h-[12.5vw] max-h-[240px] min-h-[180px] place-items-center rounded-[var(--figma-7)] bg-[#D9D9D9] text-[length:var(--figma-14)] font-semibold leading-[1.253] text-[#7A8B52]">
      {address ? "지도 API 연결 후 이 위치가 표시돼요" : "주소를 입력하면 지도가 표시돼요"}
    </div>
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
      <div className="flex flex-col gap-[2.222vw]">
        <GuideItemsBlock
          description="참가비에 포함된 항목을 입력해주세요"
          items={draft.guideInfo.includedItems}
          onChange={(includedItems) => updateGuideInfo({ includedItems })}
          title="포함 사항"
        />
        <GuideItemsBlock
          description="참가비에 불포함된 항목을 입력해주세요"
          items={draft.guideInfo.excludedItems}
          onChange={(excludedItems) => updateGuideInfo({ excludedItems })}
          title="불포함 사항"
        />
        <GuideItemsBlock
          description="참가 전 준비물과 프로그램 진행 시 꼭 알아야 할 사항을 입력해주세요"
          items={draft.guideInfo.preparationItems}
          onChange={(preparationItems) => updateGuideInfo({ preparationItems })}
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
  title,
}: {
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
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
    <DetailFormBlock className="min-h-[15.208vw] max-h-[292px]">
      <div className="flex w-full flex-col gap-[var(--figma-14)]">
        <SettingsFieldLabel>{title}</SettingsFieldLabel>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          {description}
        </p>
        <div className="flex flex-col gap-[var(--figma-14)]">
          {items.map((item, index) => (
            <div className="flex items-center gap-[var(--figma-8)]" key={index}>
              <FigmaTextInput
                onChange={(value) => updateItem(index, value)}
                placeholder={`예 : ${index === 0 ? "숙박 2박" : "프로그램 체험비 전체"}`}
                value={item}
              />
              <button
                aria-label={`${title} 항목 삭제`}
                className="shrink-0 text-[length:var(--figma-12)] font-medium text-[#6D7A8A] transition hover:text-red-600"
                onClick={() => removeItem(index)}
                type="button"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <button
          className="mx-auto text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={addItem}
          type="button"
        >
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

  return (
    <DetailFormBlock className="min-h-[17.431vw] max-h-[335px]">
      <div className="flex w-full flex-col gap-[var(--figma-14)]">
        <SettingsFieldLabel>취소 / 환불 규정</SettingsFieldLabel>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          취소 기간과 환불 비율만 입력하면 자동으로 규정이 완성돼요
        </p>
        <div className="flex flex-col gap-[var(--figma-14)]">
          {rules.map((rule, index) => (
            <div className="flex items-center gap-[var(--figma-14)]" key={rule.id}>
              <FigmaTextInput
                className="w-[4.167vw] max-w-[80px]"
                inputMode="numeric"
                onChange={(daysBefore) => updateRule(index, { daysBefore })}
                placeholder="00"
                value={rule.daysBefore}
              />
              <span className="text-[length:var(--figma-14)] text-[#6D7A8A]">
                일 전 취소 시
              </span>
              <FigmaTextInput
                className="w-[4.167vw] max-w-[80px]"
                inputMode="numeric"
                onChange={(refundRate) => updateRule(index, { refundRate })}
                placeholder="00"
                value={rule.refundRate}
              />
              <span className="text-[length:var(--figma-14)] text-[#6D7A8A]">
                % 환불
              </span>
            </div>
          ))}
        </div>
        <button
          className="w-fit text-[length:var(--figma-12)] font-normal leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={addRule}
          type="button"
        >
          항목 추가
        </button>
        <p className="text-[length:var(--figma-14)] font-normal leading-[1.253] text-[#6D7A8A]">
          [고정안내] 당일 취소 및 노쇼의 경우 환불이 불가합니다
        </p>
      </div>
    </DetailFormBlock>
  );
}

function ManagementPanel({
  draft,
  publishBlockers,
  readyToPublish,
  updateDraft,
}: {
  draft: HostProgramDraft;
  publishBlockers: ProgramDraftChecklistItem[];
  readyToPublish: boolean;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<Settings size={19} />} title={panelLabels.management}>
      <div className="grid gap-4">
        {!readyToPublish ? (
          <div className="rounded-md border border-[#F3CBB3] bg-[#FFF8F2] p-4">
            <p className="text-sm font-black text-[#0D0D0C]">
              아직 공개할 수 없습니다.
            </p>
            <p className="mt-1 text-sm font-bold leading-6 text-[#8B7A6E]">
              아래 항목을 완료하면 공개 상태를 켤 수 있습니다.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {publishBlockers.map((item) => (
                <div
                  className="rounded-md border border-[#F3E2D5] bg-white px-3 py-2"
                  key={item.id}
                >
                  <p className="text-sm font-black text-[#5B3A29]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#8B7A6E]">
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-[#F3E2D5] bg-[#FFFDFB] p-4">
          <span>
            <span className="block text-sm font-black text-[#0D0D0C]">
              공개 상태
            </span>
            <span className="mt-1 block text-sm font-bold text-[#8B7A6E]">
              체크리스트가 완료되면 공개 프로그램으로 발행할 수 있습니다.
            </span>
          </span>
          <input
            checked={draft.published}
            className="size-5 accent-[#FE701E]"
            disabled={!readyToPublish && !draft.published}
            onChange={(event) =>
              updateDraft({
                published: event.target.checked ? readyToPublish : false,
              })
            }
            type="checkbox"
          />
        </label>
        <div className="rounded-md border border-[#F3E2D5] bg-[#FFFDFB] p-4">
          <p className="text-sm font-black text-[#0D0D0C]">최근 수정</p>
          <p className="mt-2 text-sm font-bold text-[#8B7A6E]">
            {formatDateTime(draft.updatedAt)}
          </p>
        </div>
        </div>
      </div>
    </PanelCard>
  );
}

function DeletePanel({
  draft,
  isDeleting,
  onDelete,
  readyToPublish,
}: {
  draft: HostProgramDraft;
  isDeleting: boolean;
  onDelete: () => void;
  readyToPublish: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <PanelCard icon={<Trash2 size={19} />} title={panelLabels.delete}>
      <div className="rounded-md border border-red-100 bg-red-50 p-4">
        <h2 className="text-lg font-black text-red-700">
          {draft.title} 프로그램을 삭제할 수 있습니다.
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-red-700/80">
          {readyToPublish
            ? "온보딩이 완료된 프로그램이므로 대시보드의 빠른 삭제 버튼은 비활성화됩니다. 이 사이드탭에서 별도 확인 후 삭제할 수 있습니다."
            : "아직 온보딩이 완료되지 않은 프로그램입니다. 대시보드의 프로젝트 삭제 버튼 또는 이 화면에서 삭제할 수 있습니다."}
        </p>
        <label className="mt-5 flex items-start gap-3 rounded-md border border-red-200 bg-white px-4 py-3">
          <input
            checked={confirmed}
            className="mt-1 size-4 accent-red-600"
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-bold leading-6 text-red-700">
            프로그램 데이터와 폴더 연결을 삭제하는 것을 확인했습니다.
          </span>
        </label>
        <div className="mt-5 flex justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!confirmed || isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? "삭제 중" : "프로그램 삭제"}
          </button>
        </div>
      </div>
    </PanelCard>
  );
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
  onDelete,
  onOpenSchedule,
}: {
  canDelete: boolean;
  onDelete: () => void;
  onOpenSchedule: () => void;
}) {
  return (
    <div className="flex w-full gap-[1.806vw] border-t border-[#6D7A8A] bg-white px-[1.944vw] py-[1.389vw]">
      <button
        className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[19px] text-[12px] font-medium leading-[1.253] text-[#FFF6EC]"
        onClick={onOpenSchedule}
        type="button"
      >
        오픈 예약하기
      </button>
      <button
        className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#CAC4BC] px-[19px] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canDelete}
        onClick={onDelete}
        type="button"
      >
        프로젝트 삭제
      </button>
    </div>
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
  isSaving,
  onClose,
  onSchedule,
  onScheduledDateChange,
  scheduledDate,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSchedule: () => void;
  onScheduledDateChange: (value: string) => void;
  scheduledDate: string;
}) {
  return (
    <ProgramDashboardModal onClose={onClose}>
      <h2 className="text-[18px] font-bold leading-[1.253] text-[#0D0D0C]">
        오픈 예약하기
      </h2>
      <p className="mt-3 text-[13px] font-medium leading-[1.6] text-[#6D7A8A]">
        선택한 날짜에 맞춰 프로그램을 모집예정 상태로 저장합니다.
      </p>
      <label className="mt-4 grid gap-2">
        <span className="text-[13px] font-bold leading-[1.253] text-[#5B3A29]">
          오픈 예약일
        </span>
        <input
          className="h-[40px] rounded-[6px] border border-[#CAC4BC] bg-white px-3 text-[14px] font-medium leading-[1.253] text-[#0D0D0C] outline-none focus:border-[#FF9A3D] focus:ring-2 focus:ring-[#FF9A3D]/15"
          onChange={(event) => onScheduledDateChange(event.target.value)}
          type="date"
          value={scheduledDate}
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="inline-flex h-[32px] items-center rounded-[4px] bg-[#CAC4BC] px-4 text-[12px] font-bold leading-[1.253] text-white"
          onClick={onClose}
          type="button"
        >
          취소
        </button>
        <button
          className="inline-flex h-[32px] items-center rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-bold leading-[1.253] text-white disabled:opacity-45"
          disabled={isSaving || !scheduledDate}
          onClick={onSchedule}
          type="button"
        >
          {isSaving ? "저장 중" : "예약하기"}
        </button>
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
      <h2 className="text-[18px] font-bold leading-[1.253] text-[#0D0D0C]">
        프로그램을 삭제할까요?
      </h2>
      <p className="mt-3 text-[13px] font-medium leading-[1.6] text-[#6D7A8A]">
        {canDelete
          ? `${programTitle}은 아직 온보딩이 완료되지 않아 삭제할 수 있습니다.`
          : "온보딩이 완료된 프로그램은 이 버튼으로 삭제할 수 없습니다."}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="inline-flex h-[32px] items-center rounded-[4px] bg-[#CAC4BC] px-4 text-[12px] font-bold leading-[1.253] text-white"
          onClick={onClose}
          type="button"
        >
          취소
        </button>
        <button
          className="inline-flex h-[32px] items-center rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-bold leading-[1.253] text-white disabled:opacity-45"
          disabled={!canDelete || isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? "삭제 중" : "삭제하기"}
        </button>
      </div>
    </ProgramDashboardModal>
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
      <div className="w-[41.875vw] min-w-[603px] max-w-[804px] rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[1.25vw] py-[1.667vw] shadow-[0_18px_50px_rgba(0,0,0,0.12)] max-md:w-full max-md:min-w-0">
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
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function PanelCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="bg-white pt-[1.528vw]">
      <h2 className="flex items-center gap-2 text-[16px] font-black leading-6 text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
      <div className="mt-[1.389vw] space-y-4">{children}</div>
    </section>
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
  onAddressChange,
  onAddressDetailChange,
}: {
  address: string;
  addressDetail: string;
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
          oncomplete: (data) => {
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
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <FigmaTextInput
          onChange={onAddressChange}
          placeholder="집결지 주소를 검색해주세요."
          value={address}
        />
        <button
          className="inline-flex h-[var(--figma-31)] items-center justify-center gap-2 rounded-[var(--figma-7)] border border-[#E6D6CA] bg-white px-[var(--figma-12)] text-[length:var(--figma-12)] font-semibold text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E]"
          onClick={() => {
            setAddressSearchError("");
            setPostcodeEmbedded(false);
            setAddressSearchOpen(true);
          }}
          type="button"
        >
          <Search size={16} />
          주소검색
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
      className="flex w-full items-center justify-between gap-4 rounded-md border border-[#E6D6CA] bg-white px-4 py-3 text-left"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="text-base font-black text-[#28211D]">
        {label} <span className="text-sm text-[#8F837B]">(on/off)</span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-[#FE701E]" : "bg-[#D9D2CD]"
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
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

function formatProgramNumber(programId: string): string {
  const normalizedId = programId.trim();
  if (!normalizedId) return "-";

  return normalizedId.length > 12 ? normalizedId.slice(0, 12) : normalizedId;
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
  if (
    value === "basic" ||
    value === "detail" ||
    value === "schedule" ||
    value === "place" ||
    value === "guide" ||
    value === "management" ||
    value === "delete"
  ) {
    return value;
  }

  return "dashboard";
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function statusLabel(status?: ProgramStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? "상태 미정";
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
