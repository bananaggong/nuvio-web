"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  ImageIcon,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquareText,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  type HostProgramPlaceInfo,
  type HostProgramDraft,
  type ProgramDraftChecklistItem,
} from "@/lib/host-program-studio";
import {
  buildProgramPublishChecklist,
  getProgramRecruitmentMethod,
} from "@/lib/host-program-publish-readiness";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import type { ProgramStatus, ThemeKey } from "@/lib/types";
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
  delete: "취소 및 삭제",
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

const noRecruitmentApplyUrl = "#no-recruitment";

type RecruitmentMethod = "nuvio" | "external" | "none";
type PriceMode = "free" | "paid" | "undecided";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { applications, isLoading, programs: hostPrograms, reportProjects, setPrograms } =
    useHostOperationsData();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [applicationForms, setApplicationForms] = useState<ApplicationFormTemplate[]>([]);

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

  async function saveDraft() {
    if (!draft || isSaving || !draft.title.trim()) return;

    if (draft.published && publishBlockers.length > 0) {
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
        body: JSON.stringify(draft),
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
          current.filter((item) => item.id !== draft.id),
        ),
      );
      setSaveMessage("저장되었습니다.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "프로그램 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const currentUpdatedAt = draft?.updatedAt ?? program.updatedAt;
  const showPreviewRail = activePanel === "detail" || activePanel === "schedule";

  return (
    <div className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#33241C]">
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <ProgramBuilderSidebar
          activePanel={activePanel}
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          pathname={pathname}
          programId={program.id}
          programPath={programPath}
          projectHref={projectPath}
          projectLabel={projectId ? "폴더" : "프로그램 목록"}
          status={statusLabel(draft?.status ?? program.status)}
          title={draft?.title || program.title}
        />

        <section className="flex min-w-0 flex-1 flex-col border-l border-[#AEB8C2]">
          <div className="flex h-[4.514vw] min-h-[64px] items-center justify-center px-[2.778vw] text-[14px] font-semibold leading-none text-[#7C8794]">
            최근 수정일 : {formatDateTime(currentUpdatedAt)}
          </div>

          <div
            className={`grid flex-1 min-w-0 ${
              showPreviewRail
                ? "xl:grid-cols-[minmax(0,67.014vw)_minmax(300px,17.153vw)]"
                : ""
            }`}
          >
            <main className="min-w-0 px-[2.778vw] pb-[6.389vw] max-md:px-5">
              <div className="min-h-7">
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

              <div className={showPreviewRail ? "pt-[1.528vw]" : ""}>
                {activePanel === "dashboard" ? (
                  <DashboardPanel
                    applicationsHref={applicationsHref}
                    formsHref={formsHref}
                    linkedApplicationForm={linkedApplicationForm}
                    messagesHref={messagesHref}
                    publishChecklist={publishChecklist}
                    programPath={programPath}
                  />
                ) : null}
                {draft && activePanel === "basic" ? (
                  <BasicPanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "detail" ? (
                  <DetailPanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "schedule" ? (
                  <SchedulePanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "place" ? (
                  <PlacePanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "guide" ? (
                  <GuidePanel draft={draft} updateDraft={updateDraft} />
                ) : null}
                {draft && activePanel === "management" ? (
                  <ManagementPanel
                    draft={draft}
                    publishBlockers={publishBlockers}
                    readyToPublish={readyToPublish}
                    updateDraft={updateDraft}
                  />
                ) : null}
                {draft && activePanel === "delete" ? <DeletePanel draft={draft} /> : null}
              </div>
            </main>

            {showPreviewRail && draft ? (
              <ProgramBuilderPreviewRail draft={draft} panel={activePanel} />
            ) : null}
          </div>

          <div className="sticky bottom-0 flex h-[4.792vw] min-h-[60px] items-center border-t border-[#AEB8C2] bg-white px-[2.083vw]">
            <button
              className="inline-flex h-[2.083vw] min-h-[34px] min-w-[86px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[1.111vw] text-[13px] font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draft || !draft.title.trim() || isSaving}
              onClick={() => void saveDraft()}
              type="button"
            >
              {isSaving ? (
                "저장 중"
              ) : (
                <>
                  <Save size={14} />
                  저장하기
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

type ProgramBuilderSidebarProps = {
  activePanel: ProgramPanel;
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  pathname: string;
  programId: string;
  programPath: string;
  projectHref: string;
  projectLabel: string;
  status: string;
  title: string;
};

type ProgramBuilderMenuItem = {
  danger?: boolean;
  href: string;
  label: string;
};

type ProgramBuilderMenuSection = {
  items: ProgramBuilderMenuItem[];
  title: string;
};

function ProgramBuilderSidebar({
  activePanel,
  applicationsHref,
  formsHref,
  messagesHref,
  pathname,
  programId,
  programPath,
  projectHref,
  projectLabel,
  status,
  title,
}: ProgramBuilderSidebarProps) {
  const menuSections: ProgramBuilderMenuSection[] = [
    {
      title: "대시보드",
      items: [{ href: `${programPath}?panel=dashboard`, label: "대시보드" }],
    },
    {
      title: "프로그램 설정",
      items: [
        { href: `${programPath}?panel=basic`, label: "기본정보" },
        { href: `${programPath}?panel=detail`, label: "상세정보" },
        { href: `${programPath}?panel=schedule`, label: "일정안내" },
        { href: `${programPath}?panel=place`, label: "장소안내" },
        { href: `${programPath}?panel=guide`, label: "안내사항" },
      ],
    },
    {
      title: "신청폼 설정",
      items: [
        { href: formsHref, label: "신청폼 연결" },
        { href: applicationsHref, label: "신청 관리" },
        { href: messagesHref, label: "참가 메시지 관리" },
      ],
    },
    {
      title: "운영 관리",
      items: [
        { href: `${programPath}?panel=management`, label: "쿠폰 / 프로모션" },
        { href: messagesHref, label: "메시지함" },
        { href: `${applicationsHref}?panel=funnel`, label: "신청 정보 추적" },
        { href: `${applicationsHref}?panel=receipts`, label: "영수증 관리" },
        { href: `${applicationsHref}?panel=reviews`, label: "후기 관리" },
        {
          danger: true,
          href: `${programPath}?panel=delete`,
          label: "프로그램 취소 및 삭제",
        },
      ],
    },
  ];

  return (
    <aside className="w-[15.833vw] min-w-[228px] shrink-0 bg-white max-md:w-full">
      <div className="px-[0.556vw] py-[1.111vw] max-md:px-5 max-md:py-5">
        <Link
          className="inline-flex h-8 items-center gap-2 rounded-[4px] px-2 text-[13px] font-black text-[#7C8794] transition hover:bg-[#F6F1ED] hover:text-[#FE701E]"
          href={projectHref}
        >
          <ArrowLeft size={14} />
          {projectLabel}
        </Link>

        <div className="mt-[0.694vw] border-b border-[#E8E2DE] px-2 pb-[1.111vw] max-md:mt-3 max-md:pb-4">
          <p className="text-[13px] font-black leading-5 text-[#33241C]">
            {title || "프로그램 제목"}
          </p>
          <p className="mt-1 text-[12px] font-bold leading-5 text-[#7C8794]">
            프로그램 넘버 :{" "}
            <span className="font-black text-[#FE701E]">
              {formatProgramNumber(programId)}
            </span>
          </p>
          <span className="mt-2 inline-flex h-6 items-center rounded-[3px] bg-[#FFF0E6] px-2 text-[12px] font-black text-[#FE701E]">
            {status}
          </span>
        </div>

        <nav className="mt-[0.833vw] grid gap-[1.042vw] max-md:mt-4 max-md:gap-4">
          {menuSections.map((section) => (
            <ProgramBuilderMenuSectionView
              activePanel={activePanel}
              key={section.title}
              pathname={pathname}
              section={section}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function ProgramBuilderMenuSectionView({
  activePanel,
  pathname,
  section,
}: {
  activePanel: ProgramPanel;
  pathname: string;
  section: ProgramBuilderMenuSection;
}) {
  return (
    <section>
      <h2 className="px-2 text-[12px] font-black leading-5 text-[#A7B0BA]">
        {section.title}
      </h2>
      <div className="mt-1 grid gap-1">
        {section.items.map((item) => {
          const active = isProgramBuilderItemActive(item.href, pathname, activePanel);

          return (
            <Link
              className={`flex min-h-8 items-center rounded-[4px] px-2 text-[13px] font-black leading-5 transition ${
                active
                  ? "bg-[#FFF1E8] text-[#FE701E]"
                  : item.danger
                    ? "text-[#C85C42] hover:bg-[#FFF1E8]"
                    : "text-[#33241C] hover:bg-[#F6F1ED] hover:text-[#FE701E]"
              }`}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
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
  applicationsHref,
  formsHref,
  linkedApplicationForm,
  messagesHref,
  publishChecklist,
  programPath,
}: {
  applicationsHref: string;
  formsHref: string;
  linkedApplicationForm?: ApplicationFormTemplate;
  messagesHref: string;
  publishChecklist: ProgramDraftChecklistItem[];
  programPath: string;
}) {
  const completedCount = publishChecklist.filter((item) => item.done).length;
  const totalCount = publishChecklist.length;
  const ready = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-[#F3E2D5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
              <ClipboardList size={18} />
              공개 전 체크리스트
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#0D0D0C]">
              {ready ? "공개 준비가 완료되었습니다." : "공개 전에 필요한 항목을 확인해 주세요."}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
              {completedCount}/{totalCount}개 완료
              {linkedApplicationForm ? ` · 연결된 신청폼: ${linkedApplicationForm.name}` : ""}
            </p>
          </div>
          <Link
            className={`inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md px-4 text-sm font-black ${
              ready
                ? "bg-[#FE701E] text-white"
                : "border border-[#F3E2D5] bg-[#FFF8F2] text-[#5B3A29]"
            }`}
            href={`${programPath}?panel=management`}
          >
            공개 설정
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {publishChecklist.map((item) => (
            <ChecklistStatusCard item={item} key={item.id} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <ToolCard
          description="프로그램 제목, 모집 상태, 일정, 인원을 정리합니다."
          href={`${programPath}?panel=basic`}
          icon={<Settings size={20} />}
          title="프로그램 설정"
        />
        <ToolCard
          description="참여자가 제출할 질문과 안내 문구를 구성합니다."
          href={formsHref}
          icon={<FilePlus2 size={20} />}
          title="신청 폼"
        />
        <ToolCard
          description="신청자 목록과 검토 상태를 확인합니다."
          href={applicationsHref}
          icon={<Users size={20} />}
          title="신청자 관리"
        />
        <ToolCard
          description="공지, 문의, 알림 메시지를 준비합니다."
          href={messagesHref}
          icon={<MessageSquareText size={20} />}
          title="공지/문의/알림"
        />
      </div>
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
  const recruitmentMethod = getRecruitmentMethod(draft.applyUrl);
  const priceMode = getPriceMode(draft.fee);

  return (
    <section className="bg-white pt-[1.528vw]">
      <div className="w-full max-w-[925px] space-y-12 xl:max-w-[64.236vw]">
        <QuestionField label="프로그램명을 입력해주세요.">
          <LargeTextInput
            onChange={(title) => updateDraft({ title })}
            value={draft.title}
          />
        </QuestionField>

        <QuestionField label="프로그램 운영 기간을 입력해주세요.">
          <div className="rounded-md border border-[#E6D6CA] bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <BareDateInput
                ariaLabel="운영 시작일"
                onChange={(activityStart) => updateDraft({ activityStart })}
                value={draft.activityStart}
              />
              <BareDateInput
                ariaLabel="운영 종료일"
                onChange={(activityEnd) => updateDraft({ activityEnd })}
                value={draft.activityEnd}
              />
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#6F625A]">
              yyyy.mm.dd ~ yyyy.mm.dd (시간 선택시 → yyyy.mm.dd 00:00 ~
              yyyy.mm.dd 00:00)
            </p>
            <button
              className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#6F625A]"
              type="button"
            >
              <span className="text-xs">▶</span>
              당일치기 경우
            </button>
          </div>
        </QuestionField>

        <QuestionField label="모집 인원을 입력해주세요.">
          <LargeTextInput
            onChange={(capacity) => updateDraft({ capacity })}
            placeholder="예: 12명"
            value={draft.capacity}
          />
        </QuestionField>

        <QuestionField label="모집 마감일(신청 마감일)을 입력해주세요.">
          <LargeTextInput
            onChange={(recruitEnd) => updateDraft({ recruitEnd: normalizeDateInput(recruitEnd) })}
            placeholder="yyyy.mm.dd 00:00"
            value={formatDateInput(draft.recruitEnd)}
          />
        </QuestionField>

        <QuestionField label="참가자 신청(모집) 방법을 선택해 주세요.">
          <div className="grid gap-2 md:grid-cols-3">
            <ChoiceCard
              checked={recruitmentMethod === "nuvio"}
              label="누비오에서 모집해요"
              onClick={() =>
                updateDraft({
                  applyUrl: buildInternalApplyUrl(draft),
                })
              }
            />
            <ChoiceCard
              checked={recruitmentMethod === "external"}
              label="외부 링크를 이용해요"
              onClick={() =>
                updateDraft({
                  applyUrl:
                    recruitmentMethod === "external" && draft.applyUrl
                      ? draft.applyUrl
                      : "https://",
                })
              }
            />
            <ChoiceCard
              checked={recruitmentMethod === "none"}
              label="모집을 안 해요"
              onClick={() => updateDraft({ applyUrl: noRecruitmentApplyUrl })}
            />
          </div>
          {recruitmentMethod === "external" ? (
            <LargeTextInput
              onChange={(applyUrl) => updateDraft({ applyUrl })}
              placeholder="https://"
              value={draft.applyUrl}
            />
          ) : null}
        </QuestionField>

        <QuestionField label="가격을 선택해주세요.">
          <div className="grid gap-2 md:grid-cols-3">
            <ChoiceCard
              checked={priceMode === "free"}
              label="무료예요"
              onClick={() => updateDraft({ fee: "무료" })}
            />
            <ChoiceCard
              checked={priceMode === "paid"}
              label="유료예요"
              onClick={() =>
                updateDraft({ fee: priceMode === "paid" ? draft.fee : "유료" })
              }
            />
            <ChoiceCard
              checked={priceMode === "undecided"}
              label="아직 정하지 않았어요"
              onClick={() => updateDraft({ fee: "미정" })}
            />
          </div>
          {priceMode === "paid" ? (
            <LargeTextInput
              onChange={(fee) => updateDraft({ fee })}
              placeholder="예: 30,000원"
              value={draft.fee === "유료" ? "" : draft.fee}
            />
          ) : null}
        </QuestionField>
      </div>
    </section>
  );
}

function DetailPanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<ImageIcon size={19} />} title={panelLabels.detail}>
      <div className="w-full max-w-[925px] space-y-10 xl:max-w-[64.236vw]">
        <QuestionField label="행사의 카테고리를 설정해주세요.">
          <SelectInput
            label="카테고리"
            onChange={(theme) => updateDraft({ theme: theme as ThemeKey })}
            options={themeOptions}
            value={draft.theme}
          />
        </QuestionField>

        <QuestionField label="프로그램 대표 사진을 업로드해주세요. (썸네일)">
          <ImageAttachInput
            onChange={(image) => updateDraft({ image })}
            programId={draft.id}
            usage="thumbnail"
            value={draft.image}
          />
          <InfoNote>
            누비오에서는 로컬 여행의 상상력을 높이기 위해 프로그램의 시각적
            사진을 권장합니다.
          </InfoNote>
        </QuestionField>

        <QuestionField label="프로그램 내용을 간단하게 요약하여 작성해주세요.">
          <LargeTextInput
            onChange={(summary) => updateDraft({ summary })}
            placeholder="다른 채널에 공유 시 대표 이미지와 함께 표시될 짧은 소개"
            value={draft.summary}
          />
          <InfoNote>
            다른 채널로 공유 시 대표 이미지와 함께 표시되어 빠른 이해와 관심을
            유도합니다.
          </InfoNote>
        </QuestionField>

        <QuestionField label="프로그램의 상세 내용을 작성해주세요.">
          <TextArea
            label="상세 내용"
            onChange={(description) => updateDraft({ description })}
            placeholder="탐라 혹은 노션처럼 #, ##, ###, 이미지/영상 링크를 섞어 프로그램의 목적, 운영 방식, 제공 혜택을 정리해주세요."
            rows={7}
            value={draft.description}
          />
          <InfoNote>
            행사 내용을 텍스트로 함께 작성하면 검색이 향상되고, 검색엔진 최적화에도
            효과적입니다. 이미지 권장 가로 사이즈는 1000px입니다.
          </InfoNote>
        </QuestionField>
      </div>
    </PanelCard>
  );
}

function SchedulePanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
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
    updateDraft({
      itineraryDays: [
        ...draft.itineraryDays,
        createHostProgramItineraryDay(draft.itineraryDays.length + 1),
      ],
    });
  }

  function removeItineraryDay(dayId: string) {
    const nextDays = draft.itineraryDays.filter((day) => day.id !== dayId);
    updateDraft({
      itineraryDays:
        nextDays.length > 0
          ? nextDays
          : [createHostProgramItineraryDay(1)],
    });
  }

  return (
    <PanelCard icon={<CalendarDays size={19} />} title={panelLabels.schedule}>
      <div className="w-full max-w-[925px] space-y-6 xl:max-w-[64.236vw]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-bold leading-6 text-[#6D7A8A]">
            날짜별 일정, 타임테이블, 일정 사진을 입력하면 상세 페이지 일정 안내 영역에 반영됩니다.
          </p>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[#E6D6CA] bg-white px-3 text-[13px] font-black text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E]"
            onClick={addItineraryDay}
            type="button"
          >
            <Plus size={15} />
            일정 추가
          </button>
        </div>

        <div className="grid gap-4">
          {draft.itineraryDays.map((day, index) => (
            <ItineraryDayEditor
              day={day}
              dayNumber={index + 1}
              key={day.id}
              onChange={(patch) => updateItineraryDay(day.id, patch)}
              onRemove={() => removeItineraryDay(day.id)}
              programId={draft.id}
            />
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

function PlacePanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
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
    <PanelCard icon={<MapPin size={19} />} title={panelLabels.place}>
      <div className="w-full max-w-[925px] space-y-10 xl:max-w-[64.236vw]">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="지역"
            onChange={(region) => updateDraft({ region })}
            placeholder="예: 전남"
            value={draft.region}
          />
          <TextInput
            label="도시/장소"
            onChange={(city) => updateDraft({ city })}
            placeholder="예: 보성군"
            value={draft.city}
          />
        </div>

        <section className="space-y-4">
          <h3 className="text-base font-black text-[#28211D]">집결지 정보</h3>
          <QuestionField label="집결지 정보를 작성해주세요.">
            <AddressSearchField
              address={draft.placeInfo.meetingAddress}
              addressDetail={draft.placeInfo.meetingAddressDetail}
              onAddressChange={(meetingAddress) =>
                updatePlaceInfo({ meetingAddress })
              }
              onAddressDetailChange={(meetingAddressDetail) =>
                updatePlaceInfo({ meetingAddressDetail })
              }
            />
          </QuestionField>

          <QuestionField label="집결지에 대한 추가적인 사항을 메모해주세요. (선택)">
            <LargeTextInput
              onChange={(meetingMemo) => updatePlaceInfo({ meetingMemo })}
              placeholder="예: 역 2번 출구 앞, 담당자 피켓 확인"
              value={draft.placeInfo.meetingMemo}
            />
          </QuestionField>

          <QuestionField label="주차 안내">
            <LargeTextInput
              onChange={(parkingGuide) => updatePlaceInfo({ parkingGuide })}
              placeholder="예: 인근 공영주차장 이용, 행사장 내 주차 불가"
              value={draft.placeInfo.parkingGuide}
            />
          </QuestionField>

          <QuestionField label="이동 수단 안내">
            <TextArea
              label="버스 / 지하철 / 기타 교통수단"
              onChange={(transportGuide) => updatePlaceInfo({ transportGuide })}
              placeholder="버스 노선, 지하철 노선, 차가 없는 사람이 도착하는 방법을 설명해주세요."
              rows={4}
              value={draft.placeInfo.transportGuide}
            />
            <InfoNote>
              버스 노선, 지하철 노선, 다른 교통수단 등 차가 없는 사람이 도착하는
              방법을 설명해주세요.
            </InfoNote>
          </QuestionField>
        </section>

        <section className="space-y-4 border-t border-[#E8D8CD] pt-7">
          <ToggleRow
            checked={draft.placeInfo.accommodationEnabled}
            label="숙소 안내"
            onChange={(accommodationEnabled) =>
              updatePlaceInfo({ accommodationEnabled })
            }
          />
          {draft.placeInfo.accommodationEnabled ? (
            <div className="space-y-4">
              <TextInput
                label="숙소 장소"
                onChange={(accommodationName) =>
                  updatePlaceInfo({ accommodationName })
                }
                placeholder="예: 보성 청년마을 게스트하우스"
                value={draft.placeInfo.accommodationName}
              />
              <QuestionField label="숙소에 대한 추가적인 사항을 메모해주세요. (선택)">
                <LargeTextInput
                  onChange={(accommodationMemo) =>
                    updatePlaceInfo({ accommodationMemo })
                  }
                  placeholder="예: 체크인 시간, 준비물, 객실 배정 방식"
                  value={draft.placeInfo.accommodationMemo}
                />
              </QuestionField>
            </div>
          ) : null}
        </section>
      </div>
    </PanelCard>
  );
}

function GuidePanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<WalletCards size={19} />} title={panelLabels.guide}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="지원 혜택"
          onChange={(subsidyLabel) => updateDraft({ subsidyLabel })}
          placeholder="예: 숙박 1박 및 차문화 체험"
          value={draft.subsidyLabel}
        />
        <TextInput
          inputMode="numeric"
          label="지원금"
          onChange={(value) => updateDraft({ subsidyAmount: parseAmount(value) })}
          placeholder="예: 200000"
          value={String(draft.subsidyAmount || "")}
        />
        <TextInput
          label="참가비"
          onChange={(fee) => updateDraft({ fee })}
          placeholder="예: 무료"
          value={draft.fee}
        />
        <TextInput
          label="문의 연락처"
          onChange={(phone) => updateDraft({ phone })}
          placeholder="예: 010-0000-0000"
          value={draft.phone}
        />
        <TextInput
          label="신청 URL"
          onChange={(applyUrl) => updateDraft({ applyUrl })}
          placeholder="https://nuvio.kr/programs/..."
          value={draft.applyUrl}
        />
      </div>
    </PanelCard>
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

function DeletePanel({ draft }: { draft: HostProgramDraft }) {
  return (
    <PanelCard icon={<Trash2 size={19} />} title={panelLabels.delete}>
      <div className="rounded-md border border-red-100 bg-red-50 p-4">
        <h2 className="text-lg font-black text-red-700">
          {draft.title} 삭제 기능은 아직 연결하지 않았습니다.
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-red-700/80">
          실제 신청자와 신청폼이 연결될 수 있으므로 삭제/취소는 별도 확인 절차를
          붙여서 구현하는 것이 안전합니다.
        </p>
      </div>
    </PanelCard>
  );
}

function ToolCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="rounded-md border border-[#F3E2D5] bg-white p-5 transition hover:border-[#FE701E]/60 hover:bg-[#FFF6EC]"
      href={href}
    >
      <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
        열기
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function ChecklistStatusCard({ item }: { item: ProgramDraftChecklistItem }) {
  return (
    <div
      className={`rounded-md border p-4 ${
        item.done
          ? "border-[#DDEAD4] bg-[#F8FCF5]"
          : "border-[#F3E2D5] bg-[#FFFDFB]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 place-items-center rounded-full ${
            item.done
              ? "bg-[#7A8B52] text-white"
              : "bg-[#FFF1E8] text-[#FE701E]"
          }`}
        >
          {item.done ? <CheckCircle2 size={16} /> : <ClipboardList size={15} />}
        </span>
        <p className="text-sm font-black text-[#0D0D0C]">{item.label}</p>
      </div>
      <p className="mt-3 min-h-10 text-xs font-bold leading-5 text-[#8B7A6E]">
        {item.done ? "완료되었습니다." : item.helper}
      </p>
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

function QuestionField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div>
      <span className="mb-3 block text-base font-black text-[#28211D]">
        {label}
      </span>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LargeTextInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <input
      className="h-[38px] w-full rounded-[4px] border border-[#E6D6CA] bg-white px-3 text-[14px] font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#9F9288] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
}

function BareDateInput({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className="h-[38px] w-full rounded-[4px] border border-[#E6D6CA] bg-white px-3 text-[14px] font-bold text-[#0D0D0C] outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
      onChange={(event) => onChange(event.target.value)}
      type="date"
      value={value}
    />
  );
}

function ChoiceCard({
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
      aria-pressed={checked}
      className={`flex min-h-[50px] items-center gap-3 rounded-md border px-4 text-left text-sm font-black transition ${
        checked
          ? "border-[#FE701E] bg-[#FFF6EC] text-[#FE701E] ring-1 ring-[#FE701E]"
          : "border-[#E6D6CA] bg-white text-[#28211D] hover:border-[#FE701E]/60"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid size-[18px] shrink-0 place-items-center rounded-full border ${
          checked ? "border-[#FE701E]" : "border-[#9F9288]"
        }`}
      >
        {checked ? <span className="size-2 rounded-full bg-[#FE701E]" /> : null}
      </span>
      {label}
    </button>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md bg-[#EAF6FF] px-4 py-3 text-sm font-bold leading-6 text-[#4D6073]">
      <span className="mr-2 text-[#28211D]">•</span>
      {children}
    </div>
  );
}

function ImageAttachInput({
  onChange,
  programId,
  usage,
  value,
}: {
  onChange: (value: string) => void;
  programId: string;
  usage: string;
  value: string;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
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

      onChange(payload.data.url);
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
    <div className="space-y-3">
      <label className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-md bg-[#F7F5F3] px-4 text-sm font-black text-[#8F837B] transition hover:bg-[#FFF6EC] hover:text-[#FE701E]">
        {uploading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <ImagePlus size={18} />
        )}
        <span>
          {uploading
            ? "업로드 중"
            : value
              ? "사진 파일 변경"
              : "사진 파일 업로드"}
        </span>
        <input
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
          type="file"
        />
      </label>
      <p className="text-xs font-bold leading-5 text-[#8F837B]">
        JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요.
      </p>
      {error ? (
        <p className="rounded-md bg-[#FFF1ED] px-3 py-2 text-xs font-bold text-[#D94B1D]">
          {error}
        </p>
      ) : null}
      {value ? (
        <div
          aria-label="선택한 이미지 미리보기"
          className="h-40 rounded-md border border-[#E6D6CA] bg-cover bg-center"
          style={{ backgroundImage: `url("${value}")` }}
        />
      ) : null}
    </div>
  );
}

function ImageGalleryAttachInput({
  images,
  onChange,
  programId,
  usage,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  programId: string;
  usage: string;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError("");
    setUploading(true);

    try {
      const uploadedImages = await Promise.all(
        files.map((file) => uploadProgramImage(file, programId, usage)),
      );

      onChange(uniqueImages([...images, ...uploadedImages]));
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

  function removeImage(image: string) {
    onChange(images.filter((item) => item !== image));
  }

  return (
    <div className="space-y-3">
      <label className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-md bg-[#F7F5F3] px-4 text-sm font-black text-[#8F837B] transition hover:bg-[#FFF6EC] hover:text-[#FE701E]">
        {uploading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <ImagePlus size={18} />
        )}
        <span>{uploading ? "업로드 중" : "사진 여러 장 업로드"}</span>
        <input
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          multiple
          onChange={handleFileChange}
          type="file"
        />
      </label>
      <p className="text-xs font-bold leading-5 text-[#8F837B]">
        일정 사진은 여러 장을 한 번에 선택할 수 있어요. 파일당 5MB 이하 JPG, PNG, WebP, GIF를 지원합니다.
      </p>
      {error ? (
        <p className="rounded-md bg-[#FFF1ED] px-3 py-2 text-xs font-bold text-[#D94B1D]">
          {error}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image) => (
            <div
              className="group relative aspect-[4/3] overflow-hidden rounded-md border border-[#E6D6CA] bg-cover bg-center"
              key={image}
              style={{ backgroundImage: `url("${image}")` }}
            >
              <button
                aria-label="일정 사진 삭제"
                className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-white/90 text-[#5B3A29] opacity-0 shadow-sm transition group-hover:opacity-100"
                onClick={() => removeImage(image)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
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

function ItineraryDayEditor({
  day,
  dayNumber,
  onChange,
  onRemove,
  programId,
}: {
  day: HostProgramItineraryDay;
  dayNumber: number;
  onChange: (patch: Partial<HostProgramItineraryDay>) => void;
  onRemove: () => void;
  programId: string;
}) {
  const dayImages = uniqueImages([day.image, ...(day.images ?? [])]);

  function updateImages(images: string[]) {
    const nextImages = uniqueImages(images);
    onChange({
      image: nextImages[0] ?? "",
      images: nextImages,
    });
  }

  return (
    <article className="rounded-md border border-[#E6D6CA] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-black text-[#28211D]">{dayNumber}일차</h4>
        <button
          aria-label={`${dayNumber}일차 삭제`}
          className="inline-flex size-8 items-center justify-center rounded-md border border-[#E6D6CA] text-[#8F837B] transition hover:border-[#FE701E] hover:text-[#FE701E]"
          onClick={onRemove}
          type="button"
        >
          <X size={15} />
        </button>
      </div>
      <div className="space-y-4">
        <LargeTextInput
          onChange={(title) => onChange({ title })}
          placeholder={`${dayNumber}일차 요약내용 작성`}
          value={day.title}
        />
        <TextArea
          label="설명"
          onChange={(summary) => onChange({ summary })}
          placeholder="하루 일정의 핵심 경험과 흐름을 짧게 작성해주세요."
          rows={3}
          value={day.summary}
        />
        <TextArea
          label="타임테이블"
          onChange={(timetable) => onChange({ timetable })}
          placeholder="09:00 집결&#10;10:00 로컬 투어&#10;14:00 체험 프로그램"
          rows={5}
          value={day.timetable}
        />
        <ImageGalleryAttachInput
          images={dayImages}
          onChange={updateImages}
          programId={programId}
          usage={`day-${dayNumber}`}
        />
      </div>
    </article>
  );
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
        <LargeTextInput
          onChange={onAddressChange}
          placeholder="집결지 주소를 검색해주세요."
          value={address}
        />
        <button
          className="inline-flex h-[38px] items-center justify-center gap-2 rounded-[4px] border border-[#E6D6CA] bg-white px-4 text-[13px] font-black text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E]"
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
        className="h-[38px] w-full rounded-[4px] border border-[#E6D6CA] bg-white px-3 text-[14px] font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#9F9288] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        onChange={(event) => onAddressDetailChange(event.target.value)}
        placeholder="상세주소를 입력해주세요."
        ref={detailAddressInputRef}
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

function TextInput({
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
      <input
        className="h-11 rounded-md border border-[#E6D6CA] bg-white px-3 text-sm font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
      <select
        className="h-11 rounded-md border border-[#E6D6CA] bg-white px-3 text-sm font-bold text-[#0D0D0C] outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
      <textarea
        className="w-full rounded-md border border-[#E6D6CA] bg-white p-3 text-sm font-bold leading-6 text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
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

function isProgramBuilderItemActive(
  href: string,
  pathname: string,
  activePanel: ProgramPanel,
): boolean {
  const [hrefPath, hrefQuery = ""] = href.split("?");
  const itemPanel = new URLSearchParams(hrefQuery).get("panel");

  if (itemPanel) {
    return hrefPath === pathname && itemPanel === activePanel;
  }

  return hrefPath === pathname;
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

function parseAmount(value: string): number {
  const normalized = value.replace(/[^\d]/gu, "");
  return normalized ? Number(normalized) : 0;
}

function statusLabel(status?: ProgramStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? "상태 미정";
}

function getRecruitmentMethod(applyUrl: string): RecruitmentMethod {
  return getProgramRecruitmentMethod(applyUrl);
}

function buildInternalApplyUrl(draft: HostProgramDraft): string {
  const programKey = draft.slug || draft.id;
  return `/programs/${programKey}/apply`;
}

function getPriceMode(fee: string): PriceMode {
  const normalizedFee = fee.trim();

  if (!normalizedFee || normalizedFee === "무료") return "free";
  if (normalizedFee === "미정" || normalizedFee === "가격 미정" || normalizedFee === "TBD") {
    return "undecided";
  }

  return "paid";
}

function formatDateInput(value: string): string {
  const isoDate = normalizeDateInput(value);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(isoDate)) return value;

  const [year, month, day] = isoDate.split("-");
  return `${year}.${month}.${day} 00:00`;
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
