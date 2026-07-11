"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, FileText, Flame, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HostProgramSidebar } from "@/components/host-program-sidebar";
import {
  isQuestionBlock,
  normalizeApplicationFormTemplateShape,
  type ApplicationFormBlock,
  type ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  findHostProgramOverview,
  findHostProgramDraft,
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
import type {
  HostApplication,
  HostApplicationStatus,
  MessageTemplate,
} from "@/lib/host-operations";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  formatApplicationDisplayCode,
  formatProgramDisplayName,
} from "@/lib/display-code";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  renderMessageTemplate,
} from "@/lib/message-automation";
import type { ReviewStatus } from "@/lib/types";
import { useHostMessageTemplates } from "@/lib/use-host-message-templates";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type ReviewTab = "all" | "pending" | "accepted" | "rejected";
type ApplicationsPanel = "applications" | "receipts" | "reviews";
type ReviewRatingFilter = "all" | 5 | 4 | 3 | 2 | 1;
type ReviewSortOrder = "latest" | "oldest";
type ReviewVisibilityFilter = "all" | "replyMissing" | "hidden";

type HostReviewManagementItem = {
  id: number | string;
  applicationId?: string;
  author: string;
  body: string;
  date: string;
  excerpt?: string;
  images?: string[];
  programLegacyId?: number;
  programSlug?: string;
  programTitle?: string;
  programUuid?: string;
  published?: boolean;
  publishedAt?: string;
  rating?: number;
  status?: ReviewStatus;
  submittedAt?: string;
  title?: string;
  updatedAt?: string;
};

const applicationFigmaScaleStyle = {
  "--app-3": "clamp(3px, 0.208vw, 4px)",
  "--app-4": "clamp(4px, 0.278vw, 5.333px)",
  "--app-6": "clamp(6px, 0.417vw, 8px)",
  "--app-8": "clamp(8px, 0.556vw, 10.667px)",
  "--app-12": "clamp(12px, 0.833vw, 16px)",
  "--app-16": "clamp(16px, 1.111vw, 21.333px)",
  "--app-18": "clamp(18px, 1.25vw, 24px)",
  "--app-20": "clamp(20px, 1.389vw, 26.667px)",
  "--app-22": "clamp(22px, 1.528vw, 29.333px)",
  "--app-24": "clamp(24px, 1.667vw, 32px)",
  "--app-28": "clamp(28px, 1.944vw, 37.333px)",
  "--app-29": "clamp(29px, 2.014vw, 38.667px)",
  "--app-34": "clamp(34px, 2.361vw, 45.333px)",
  "--app-40": "clamp(40px, 2.778vw, 53.333px)",
  "--app-47": "clamp(47px, 3.264vw, 62.667px)",
  "--app-52": "clamp(52px, 3.611vw, 69.333px)",
  "--app-55": "clamp(55px, 3.819vw, 73.333px)",
  "--app-65": "clamp(65px, 4.514vw, 86.667px)",
  "--app-69": "clamp(69px, 4.792vw, 92px)",
  "--app-77": "clamp(77px, 5.347vw, 102.667px)",
  "--app-88": "clamp(88px, 6.111vw, 117.333px)",
  "--app-91": "clamp(91px, 6.319vw, 121.333px)",
  "--app-119": "clamp(119px, 8.264vw, 158.667px)",
  "--app-167": "clamp(167px, 11.597vw, 222.667px)",
  "--app-180": "clamp(180px, 12.5vw, 240px)",
  "--app-192": "clamp(192px, 13.333vw, 256px)",
  "--app-216": "clamp(216px, 15vw, 288px)",
  "--app-228": "clamp(228px, 15.833vw, 304px)",
  "--app-296": "clamp(296px, 20.556vw, 394.667px)",
  "--app-327": "clamp(327px, 22.708vw, 436px)",
  "--app-358": "clamp(358px, 24.861vw, 477.333px)",
  "--app-389": "clamp(389px, 27.014vw, 518.667px)",
  "--app-420": "clamp(420px, 29.167vw, 560px)",
  "--app-438": "clamp(438px, 30.417vw, 584px)",
  "--app-555": "clamp(555px, 38.542vw, 740px)",
  "--app-577": "clamp(577px, 40.069vw, 769.333px)",
  "--app-625": "clamp(625px, 43.403vw, 833.333px)",
} as CSSProperties;

const reviewTabs: Array<{ label: string; value: ReviewTab }> = [
  { label: "전체", value: "all" },
  { label: "대기", value: "pending" },
  { label: "승인", value: "accepted" },
  { label: "거절", value: "rejected" },
];

const applicationStatusOptions: Array<{
  description: string;
  label: string;
  value: HostApplicationStatus;
}> = [
  {
    description: "아직 심사나 확정 처리를 하지 않은 신청자로 되돌립니다.",
    label: "검토대기",
    value: "screening",
  },
  {
    description: "참여 가능한 신청자로 확정합니다.",
    label: "승인",
    value: "accepted",
  },
  {
    description: "이번 프로그램 참여가 어려운 신청자로 표시합니다.",
    label: "거절",
    value: "rejected",
  },
  {
    description: "프로그램 참여가 진행 중인 신청자로 표시합니다.",
    label: "참여중",
    value: "checkedIn",
  },
  {
    description: "프로그램 참여와 후속 처리가 끝난 신청자로 표시합니다.",
    label: "완료",
    value: "completed",
  },
];

const reviewRatingFilterOptions: Array<{
  key: string;
  label: string;
  value: ReviewRatingFilter;
}> = [
  { key: "all", label: "전체", value: "all" },
  { key: "5", label: "5점", value: 5 },
  { key: "4", label: "4점", value: 4 },
  { key: "3", label: "3점", value: 3 },
  { key: "2", label: "2점", value: 2 },
  { key: "1", label: "1점", value: 1 },
];

const reviewVisibilityFilterOptions: Array<{
  label: string;
  value: ReviewVisibilityFilter;
}> = [
  { label: "전체 후기", value: "all" },
  { label: "답글 미작성 후기", value: "replyMissing" },
  { label: "숨김처리된 후기", value: "hidden" },
];

export function HostApplicationsCrm({
  programId,
  projectId,
}: {
  programId?: string;
  projectId?: string;
}) {
  const searchParams = useSearchParams();
  const requestedApplicationId = searchParams.get("applicationId") ?? "";
  const { applications, programs: hostPrograms, reportProjects, setApplications } =
    useHostOperationsData();
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const [checkedApplicationIds, setCheckedApplicationIds] = useState<string[]>([]);
  const [applicationFormTemplates, setApplicationFormTemplates] =
    useState<ApplicationFormTemplate[]>([]);
  const { templates: messageTemplates } = useHostMessageTemplates();
  const [hostReviews, setHostReviews] =
    useState<HostReviewManagementItem[]>([]);
  const [isLoadingHostReviews, setIsLoadingHostReviews] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);
  const [reviewPanelMessage, setReviewPanelMessage] = useState("");
  const [reviewPanelError, setReviewPanelError] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] =
    useState<ReviewRatingFilter>("all");
  const [reviewSortOrder, setReviewSortOrder] =
    useState<ReviewSortOrder>("latest");
  const [reviewVisibilityFilter, setReviewVisibilityFilter] =
    useState<ReviewVisibilityFilter>("all");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusDialogValue, setStatusDialogValue] =
    useState<HostApplicationStatus>("screening");
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageRecipientIds, setMessageRecipientIds] = useState<string[]>([]);
  const [selectedMessageTemplateId, setSelectedMessageTemplateId] = useState("");
  const [messageScheduleDate, setMessageScheduleDate] = useState("");
  const [messageScheduleTime, setMessageScheduleTime] = useState("");
  const [messageDialogStatus, setMessageDialogStatus] = useState("");
  const [isSchedulingMessage, setIsSchedulingMessage] = useState(false);

  const activePanel: ApplicationsPanel =
    searchParams.get("panel") === "receipts"
      ? "receipts"
      : launchFeatureFlags.reviews && searchParams.get("panel") === "reviews"
        ? "reviews"
        : "applications";

  const project = useMemo(() => {
    if (!projectId) return undefined;
    return findHostProjectOverview(projectId, applications, reportProjects, hostPrograms);
  }, [applications, hostPrograms, projectId, reportProjects]);
  const program = useMemo(() => {
    if (projectId && programId) {
      const projectProgram = findHostProgramOverview(
        projectId,
        programId,
        applications,
        reportProjects,
        hostPrograms,
      );
      if (projectProgram) return projectProgram;
    }
    if (programId) {
      return (
        findStandaloneHostProgramOverview(
          programId,
          applications,
          reportProjects,
          hostPrograms,
        ) ??
        findHostProgramDraftOverview(programId, applications, hostPrograms)
      );
    }
    return undefined;
  }, [applications, hostPrograms, programId, projectId, reportProjects]);

  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && program
      ? hostProgramPath(projectId, program.id)
      : program
        ? hostStandaloneProgramPath(program.id)
        : programId
          ? projectId
            ? hostProgramPath(projectId, programId)
            : hostStandaloneProgramPath(programId)
          : undefined;
  const scopedApplications = program
    ? program.applications
    : project
      ? project.applications
      : programId
        ? applications.filter((application) =>
            matchesProgramIdentifier(application, programId),
          )
        : applications;
  const filteredApplications = scopedApplications.filter((application) =>
    matchesReviewTab(application, activeTab),
  );
  const selectedLookupApplicationId =
    selectedApplicationId || requestedApplicationId;
  const selectedApplication =
    filteredApplications.find(
      (application) => application.id === selectedLookupApplicationId,
    ) ??
    filteredApplications[0] ??
    scopedApplications[0];
  const selectedScopedApplication =
    scopedApplications.find(
      (application) => application.id === selectedLookupApplicationId,
    ) ??
    scopedApplications[0];
  const resolvedProgramBasePath = programBasePath ?? projectBasePath ?? "/host/programs";
  const applicationsHref = `${resolvedProgramBasePath}/applications`;
  const formsHref = `${resolvedProgramBasePath}/forms`;
  const messagesHref = `${resolvedProgramBasePath}/messages`;
  const rawSidebarTitle =
    program?.title ??
    selectedApplication?.programTitle ??
    project?.title ??
    (programId ? "프로그램 정보 없음" : "프로그램 미선택");
  const sidebarTitle = selectedApplication
    ? formatProgramDisplayName(rawSidebarTitle, selectedApplication.programId)
    : rawSidebarTitle;
  const sidebarProgramId = program?.id ?? programId ?? selectedApplication?.programId ?? "";
  const sidebarDraft = useMemo(() => {
    const identifiers = [
      sidebarProgramId,
      selectedApplication?.programId,
      selectedApplication?.programTitle
        ? hostProgramId(selectedApplication.programTitle)
        : "",
      sidebarTitle ? hostProgramId(sidebarTitle) : "",
    ].filter((identifier): identifier is string => Boolean(identifier));

    for (const identifier of identifiers) {
      const draft = findHostProgramDraft(identifier, hostPrograms);
      if (draft) return draft;
    }

    return undefined;
  }, [hostPrograms, selectedApplication, sidebarProgramId, sidebarTitle]);
  const sidebarStatus = getHostProgramSidebarStatus(program, sidebarDraft);
  const scopedHostReviews = useMemo(
    () =>
      hostReviews.filter((review) =>
        matchesHostReviewProgram(review, {
          program,
          programId: sidebarProgramId,
          programTitle: sidebarTitle,
          scopedApplications,
        }),
      ),
    [hostReviews, program, scopedApplications, sidebarProgramId, sidebarTitle],
  );
  const selectedApplicationTemplate = useMemo(
    () =>
      resolveApplicationTemplate(
        selectedApplication,
        applicationFormTemplates,
        sidebarProgramId,
        sidebarTitle,
      ),
    [applicationFormTemplates, selectedApplication, sidebarProgramId, sidebarTitle],
  );
  const checkedApplications = applications.filter((application) =>
    checkedApplicationIds.includes(application.id),
  );
  const checkedCount = checkedApplications.length;
  const messageRecipients = messageRecipientIds
    .map((applicationId) =>
      scopedApplications.find((application) => application.id === applicationId) ??
      applications.find((application) => application.id === applicationId),
    )
    .filter((application): application is HostApplication => Boolean(application));
  const selectedMessageTemplate =
    messageTemplates.find((template) => template.id === selectedMessageTemplateId) ??
    messageTemplates[0];

  function selectApplication(applicationId: string) {
    setSelectedApplicationId(applicationId);
    setMobilePane("detail");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadApplicationForms() {
      try {
        const response = await fetch("/api/host/forms?kind=application", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];
        if (cancelled) return;

        setApplicationFormTemplates(databaseTemplates);
      } catch {
        // 신청관리 화면은 신청자 데이터가 우선이라 폼 목록 실패는 조용히 넘깁니다.
      }
    }

    void loadApplicationForms();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHostReviews() {
      setIsLoadingHostReviews(true);
      setReviewPanelMessage("");
      setReviewPanelError("");
      try {
        const response = await fetch("/api/host/reviews", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setHostReviews([]);
          return;
        }

        const payload = (await response.json()) as {
          data?: HostReviewManagementItem[];
        };
        if (!cancelled) setHostReviews(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!cancelled) setHostReviews([]);
      } finally {
        if (!cancelled) setIsLoadingHostReviews(false);
      }
    }

    if (activePanel === "reviews") void loadHostReviews();

    return () => {
      cancelled = true;
    };
  }, [activePanel]);

  async function updateReviewVisibility(
    review: HostReviewManagementItem,
    hidden: boolean,
  ) {
    const reviewId = String(review.id);
    setUpdatingReviewId(reviewId);
    setReviewPanelMessage("");
    setReviewPanelError("");

    const nextStatus: ReviewStatus = hidden ? "hidden" : "published";

    try {
      const response = await fetch("/api/host/reviews", {
        body: JSON.stringify({
          hiddenReason: hidden ? "host_hidden" : undefined,
          id: reviewId,
          status: nextStatus,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as {
        data?: HostReviewManagementItem;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "후기 상태를 변경하지 못했습니다.");
      }

      setHostReviews((currentReviews) =>
        currentReviews.map((currentReview) =>
          String(currentReview.id) === reviewId
            ? { ...currentReview, ...payload.data }
            : currentReview,
        ),
      );
      setReviewPanelMessage(hidden ? "후기를 숨김처리했습니다." : "후기 숨김을 해제했습니다.");
    } catch (error) {
      setReviewPanelError(
        error instanceof Error ? error.message : "후기 상태를 변경하지 못했습니다.",
      );
    } finally {
      setUpdatingReviewId(null);
    }
  }

  function toggleCheckedApplication(applicationId: string) {
    setCheckedApplicationIds((currentIds) =>
      currentIds.includes(applicationId)
        ? currentIds.filter((id) => id !== applicationId)
        : [...currentIds, applicationId],
    );
  }

  function updateApplicationStatuses(
    applicationIds: string[],
    status: HostApplicationStatus,
  ) {
    if (applicationIds.length === 0) return;

    const targetIds = new Set(applicationIds);
    const next = applications.map((application) =>
      targetIds.has(application.id) ? { ...application, status } : application,
    );

    setApplications(next);
    applicationIds.forEach((applicationId) => {
      void persistApplicationStatus(applicationId, status);
    });
  }

  function approveCheckedApplications() {
    updateApplicationStatuses(checkedApplicationIds, "accepted");
    setCheckedApplicationIds([]);
  }

  function openStatusDialog() {
    if (checkedCount === 0) return;
    setStatusDialogValue(checkedApplications[0]?.status ?? "screening");
    setIsStatusDialogOpen(true);
  }

  function submitStatusDialog() {
    updateApplicationStatuses(checkedApplicationIds, statusDialogValue);
    setCheckedApplicationIds([]);
    setIsStatusDialogOpen(false);
  }

  function openMessageDialog() {
    if (checkedCount === 0) return;

    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setMessageRecipientIds(checkedApplicationIds);
    setSelectedMessageTemplateId((currentId) => currentId || messageTemplates[0]?.id || "");
    setMessageScheduleDate((currentDate) => currentDate || localNow.toISOString().slice(0, 10));
    setMessageScheduleTime((currentTime) => currentTime || localNow.toISOString().slice(11, 16));
    setMessageDialogStatus("");
    setIsMessageDialogOpen(true);
  }

  function removeMessageRecipient(applicationId: string) {
    setMessageRecipientIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== applicationId),
    );
  }

  async function scheduleSelectedMessages() {
    if (!selectedMessageTemplate || messageRecipients.length === 0) return;

    setIsSchedulingMessage(true);
    setMessageDialogStatus("");

    try {
      const response = await fetch("/api/host/scheduled-messages", {
        body: JSON.stringify({
          applicationIds: messageRecipients.map((recipient) => recipient.id),
          channel: "sms",
          scheduledFor:
            messageScheduleDate && messageScheduleTime
              ? `${messageScheduleDate}T${messageScheduleTime}`
              : "",
          status: "scheduled",
          templateBody: selectedMessageTemplate.body,
          templateId: selectedMessageTemplate.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: {
          insertedCount?: number;
          recipientCount?: number;
          sheetSync?: { message?: string; status?: string };
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "메시지 예약에 실패했습니다.");
      }

      const insertedCount = payload.data?.insertedCount ?? 0;
      const sheetSync = payload.data?.sheetSync;
      const sheetMessage =
        sheetSync?.status === "synced"
          ? " Google Sheet에도 추가했습니다."
          : sheetSync?.status === "skipped"
            ? ` Google Sheet 동기화는 건너뜀: ${sheetSync.message ?? ""}`
            : sheetSync?.status === "failed"
              ? ` Google Sheet 동기화 실패: ${sheetSync.message ?? ""}`
              : "";
      if (insertedCount > 0) {
        setMessageDialogStatus(`${insertedCount}명에게 보낼 메시지를 예약했습니다.`);
      } else {
        setMessageDialogStatus(
          "데모 신청자는 화면에서만 확인됩니다. 실제 신청자 데이터에서는 예약 메시지로 저장됩니다.",
        );
      }
      if (sheetMessage) {
        setMessageDialogStatus((currentMessage) => `${currentMessage}${sheetMessage}`);
      }
      setCheckedApplicationIds((currentIds) =>
        currentIds.filter((id) => !messageRecipientIds.includes(id)),
      );
    } catch (error) {
      setMessageDialogStatus(
        error instanceof Error ? error.message : "메시지 예약에 실패했습니다.",
      );
    } finally {
      setIsSchedulingMessage(false);
    }
  }

  return (
    <div
      className="font-pretendard h-[calc(100vh_-_4.861vw)] min-h-0 overflow-hidden bg-white text-[#5B3A29]"
      style={applicationFigmaScaleStyle}
    >
      <div className="flex h-full min-h-0 max-md:flex-col">
        <HostProgramSidebar
          activeItem={activePanel}
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          programId={sidebarProgramId}
          programPath={resolvedProgramBasePath}
          status={sidebarStatus}
          title={sidebarTitle}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activePanel === "applications" ? (
            <div className="hidden min-h-11 grid-cols-2 border-b border-[#D9D9D9] bg-white px-5 max-md:grid">
              {([
                ["list", "신청자 목록"],
                ["detail", "신청 정보"],
              ] as const).map(([pane, label]) => (
                <button
                  aria-pressed={mobilePane === pane}
                  className={`min-h-11 border-b-2 text-sm font-semibold ${
                    mobilePane === pane
                      ? "border-[#FE701E] text-[#FE701E]"
                      : "border-transparent text-[#6D7A8A]"
                  }`}
                  key={pane}
                  onClick={() => setMobilePane(pane)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <main
            className={
              activePanel === "applications"
                ? "flex min-h-0 flex-1 overflow-hidden bg-white"
                : "min-h-0 flex-1 overflow-auto bg-white"
            }
          >
            {activePanel === "receipts" ? (
              <PaymentManagementPanel
                applications={scopedApplications}
                messagesHref={messagesHref}
                selectedApplication={selectedScopedApplication}
                onSelect={(applicationId) => setSelectedApplicationId(applicationId)}
              />
            ) : null}
            {activePanel === "reviews" ? (
              <ReviewManagementPanel
                errorMessage={reviewPanelError}
                isLoading={isLoadingHostReviews}
                onRatingFilterChange={setReviewRatingFilter}
                onSortOrderChange={setReviewSortOrder}
                onToggleVisibility={(review, hidden) =>
                  void updateReviewVisibility(review, hidden)
                }
                onVisibilityFilterChange={setReviewVisibilityFilter}
                ratingFilter={reviewRatingFilter}
                reviews={scopedHostReviews}
                sortOrder={reviewSortOrder}
                statusMessage={reviewPanelMessage}
                updatingReviewId={updatingReviewId}
                visibilityFilter={reviewVisibilityFilter}
              />
            ) : null}
            {activePanel === "applications" ? (
              <>
                <div className={`contents ${mobilePane === "list" ? "" : "max-md:hidden"}`}>
                  <ApplicationListPanel
                    activeTab={activeTab}
                    applications={filteredApplications}
                    checkedApplicationIds={checkedApplicationIds}
                    onSelect={selectApplication}
                    onTabChange={setActiveTab}
                    onToggleChecked={toggleCheckedApplication}
                    selectedApplicationId={selectedApplication?.id ?? ""}
                  />
                </div>
                <div className={`contents ${mobilePane === "detail" ? "" : "max-md:hidden"}`}>
                  <ApplicationDetailPanel
                    application={selectedApplication}
                    formTemplate={selectedApplicationTemplate}
                    program={program}
                    programDraft={sidebarDraft}
                    programTitle={sidebarTitle}
                  />
                </div>
              </>
            ) : null}
          </main>

          {activePanel === "applications" ? (
            <div className="flex h-[var(--app-69)] shrink-0 items-start gap-[10px] border-t border-[#6D7A8A] bg-white pl-[var(--app-29)] pt-[var(--app-20)] max-md:items-center max-md:px-5 max-md:pt-0">
              <button
                className={`inline-flex h-[var(--app-29)] w-[var(--app-91)] items-center justify-center rounded-[4px] border text-[12px] font-normal leading-[1.253] max-md:min-h-11 max-md:flex-1 max-md:text-sm ${
                  checkedCount > 0
                    ? "border-[#FE701E] bg-white text-[#FE701E]"
                    : "border-[#D9D9D9] bg-[#F3F3F3] text-[#AEB8C2]"
                }`}
                disabled={checkedCount === 0}
                onClick={openMessageDialog}
                type="button"
              >
                메시지 전송
              </button>
              <button
                className={`inline-flex h-[var(--app-29)] w-[var(--app-77)] items-center justify-center rounded-[4px] border text-[12px] font-normal leading-[1.253] max-md:min-h-11 max-md:flex-1 max-md:text-sm ${
                  checkedCount > 0
                    ? "border-[#7A8B52] bg-[#7A8B52] text-white"
                    : "border-[#D9D9D9] bg-[#F3F3F3] text-[#AEB8C2]"
                }`}
                disabled={checkedCount === 0}
                onClick={approveCheckedApplications}
                type="button"
              >
                승인
              </button>
              <button
                className={`inline-flex h-[var(--app-29)] w-[var(--app-91)] items-center justify-center rounded-[4px] border text-[12px] font-normal leading-[1.253] max-md:min-h-11 max-md:flex-1 max-md:text-sm ${
                  checkedCount > 0
                    ? "border-[#6D7A8A] bg-white text-[#5B3A29]"
                    : "border-[#D9D9D9] bg-[#F3F3F3] text-[#AEB8C2]"
                }`}
                disabled={checkedCount === 0}
                onClick={openStatusDialog}
                type="button"
              >
                상태 수정
              </button>
              {checkedCount > 0 ? (
                <span className="inline-flex h-[var(--app-29)] items-center text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
                  {checkedCount}명 선택
                </span>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      {isStatusDialogOpen ? (
        <StatusChangeDialog
          applicationCount={checkedCount}
          onClose={() => setIsStatusDialogOpen(false)}
          onSubmit={submitStatusDialog}
          onValueChange={setStatusDialogValue}
          value={statusDialogValue}
        />
      ) : null}
      {isMessageDialogOpen ? (
        <SendMessageDialog
          isScheduling={isSchedulingMessage}
          onClose={() => setIsMessageDialogOpen(false)}
          onRemoveRecipient={removeMessageRecipient}
          onSchedule={scheduleSelectedMessages}
          onScheduleDateChange={setMessageScheduleDate}
          onScheduleTimeChange={setMessageScheduleTime}
          onTemplateChange={setSelectedMessageTemplateId}
          recipients={messageRecipients}
          scheduleDate={messageScheduleDate}
          scheduleTime={messageScheduleTime}
          selectedTemplateId={selectedMessageTemplate?.id ?? ""}
          statusMessage={messageDialogStatus}
          templates={messageTemplates}
        />
      ) : null}
    </div>
  );
}

function ApplicationListPanel({
  activeTab,
  applications,
  checkedApplicationIds,
  onSelect,
  onTabChange,
  onToggleChecked,
  selectedApplicationId,
}: {
  activeTab: ReviewTab;
  applications: HostApplication[];
  checkedApplicationIds: string[];
  onSelect: (applicationId: string) => void;
  onTabChange: (tab: ReviewTab) => void;
  onToggleChecked: (applicationId: string) => void;
  selectedApplicationId: string;
}) {
  return (
    <section className="w-[var(--app-625)] shrink-0 overflow-y-auto border-r border-[#6D7A8A] bg-white max-md:w-full max-md:border-r-0">
      <div className="ml-[var(--app-40)] mt-[var(--app-47)] w-[var(--app-577)] border-b border-[#CAC4BC] max-md:ml-0 max-md:mt-5 max-md:w-full max-md:px-5">
        <div className="flex h-[27px] items-start gap-[12px] max-md:h-11">
          {reviewTabs.map((tab) => (
            <button
              className={`relative h-[27px] text-[14px] leading-[1.253] max-md:min-h-11 max-md:min-w-11 ${
                activeTab === tab.value
                  ? "font-semibold text-[#5B3A29] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:bg-[#FE701E]"
                  : "font-normal text-[#CAC4BC]"
              }`}
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-[var(--app-40)] mt-[23px] grid w-[var(--app-577)] gap-[9px] max-md:ml-0 max-md:w-full max-md:px-5">
        {applications.length > 0 ? (
          applications.map((application) => (
            <ApplicationRow
              application={application}
              checked={checkedApplicationIds.includes(application.id)}
              key={application.id}
              onSelect={onSelect}
              onToggleChecked={onToggleChecked}
              selected={application.id === selectedApplicationId}
            />
          ))
        ) : (
          <div className="flex h-[34px] items-center px-[6px] text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
            표시할 신청자가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function ApplicationRow({
  application,
  checked,
  onSelect,
  onToggleChecked,
  selected,
}: {
  application: HostApplication;
  checked: boolean;
  onSelect: (applicationId: string) => void;
  onToggleChecked: (applicationId: string) => void;
  selected: boolean;
}) {
  const reviewStatus = getReviewStatus(application.status);
  const messageStatus = getMessageStatus(application.status);

  return (
    <div
      className={`grid h-[34px] w-full grid-cols-[22px_112px_70px_160px_84px_minmax(0,1fr)] items-center text-left text-[14px] leading-[1.253] max-md:h-auto max-md:min-h-14 max-md:grid-cols-[44px_minmax(0,1fr)] ${
        selected ? "bg-[#F3F3F3]" : "bg-white"
      }`}
    >
      <label className="grid size-11 place-items-center">
        <span className="sr-only">{application.applicantName || "신청자"} 선택</span>
        <input
          aria-label={`${application.applicantName || "신청자"} 선택`}
          checked={checked}
          className="size-[14px] accent-[#FE701E] max-md:size-5"
          onChange={() => onToggleChecked(application.id)}
          type="checkbox"
        />
      </label>
      <button
        className="contents text-left max-md:flex max-md:min-h-14 max-md:min-w-0 max-md:items-center max-md:gap-2"
        onClick={() => onSelect(application.id)}
        type="button"
      >
        <span className="truncate font-semibold text-[#0D0D0C]">
          {application.applicantName || "이름 미입력"}
        </span>
        <span className="font-semibold text-[#0D0D0C] max-md:hidden">성별</span>
        <span className="font-normal text-[#6D7A8A] max-md:ml-auto max-md:shrink-0 max-md:text-xs">
          접수일 {formatShortDate(application.submittedAt)}
        </span>
        <span
          className={`inline-flex h-[21px] w-fit items-center rounded-[6px] px-[8px] text-[12px] font-semibold leading-[1.253] max-md:hidden ${reviewStatus.className}`}
        >
          {reviewStatus.label}
        </span>
        <span className="flex items-center justify-end gap-[3px] pr-[8px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] max-md:hidden">
          <span className={`size-[4px] rounded-full ${messageStatus.dotClassName}`} />
          {messageStatus.label}
        </span>
      </button>
    </div>
  );
}

function ApplicationDetailPanel({
  application,
  formTemplate,
  program,
  programDraft,
  programTitle,
}: {
  application?: HostApplication;
  formTemplate?: ApplicationFormTemplate;
  program?: HostProgramOverview;
  programDraft?: HostProgramDraft;
  programTitle: string;
}) {
  if (!application) {
    return (
      <section className="min-h-0 min-w-0 flex-1 bg-white pl-[var(--app-20)] pr-[11px] pt-[var(--app-52)]">
        <div className="flex h-full w-[var(--app-555)] max-w-full items-center justify-center rounded-[6px] border border-dashed border-[#CAC4BC] bg-[#F9F9F9] px-[24px] py-[32px] text-center">
          <div>
            <h2 className="text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
              아직 선택할 신청자가 없습니다.
            </h2>
            <p className="mt-[10px] text-[13px] font-normal leading-[1.6] text-[#6D7A8A]">
              신청자가 접수되면 이 영역에서 신청 정보와 신청서 응답을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const statusMeta = application ? getApplicationStatusMeta(application.status) : undefined;
  const answers = application?.answers ?? {};
  const answerMap = buildApplicationAnswerMap(answers);
  const fallbackBlocks = buildFallbackBlocksFromAnswers(answers);
  const previewBlocks =
    formTemplate?.blocks && formTemplate.blocks.length > 0
      ? formTemplate.blocks
      : fallbackBlocks;
  const formTitle =
    asString(answers.templateName) ||
    formTemplate?.name ||
    (application ? "제출된 신청서" : "프로그램 신청서");
  const formDescription =
    formTemplate?.description ||
    (previewBlocks.length > 0
      ? "신청자가 제출한 실제 응답을 연결된 신청폼 구조로 보여줍니다."
      : "신청서 응답이 아직 없습니다.");
  const applicantGender =
    findAnswerTextByLabels(answerMap, ["성별", "gender"]) || "성별 미입력";
  const programImageUrl = programDraft?.image || program?.imageUrl || "";
  const programLocation =
    [programDraft?.region, programDraft?.city].filter(Boolean).join(" ") ||
    "지역 정보 미입력";
  const hostName = programDraft?.sourceName || "호스트명 미입력";
  const startDate = formatApplicationPanelDate(programDraft?.activityStart);
  const endDate = formatApplicationPanelDate(programDraft?.activityEnd);

  return (
    <section className="min-h-0 min-w-0 flex-1 bg-white pl-[var(--app-20)] pr-[11px] pt-[var(--app-52)] max-md:flex max-md:w-full max-md:flex-col max-md:px-5 max-md:pt-5">
      <div className="flex h-[28px] items-start text-[16px] font-semibold leading-[1.253] text-[#0D0D0C] max-md:h-auto max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2">
        <span>{application.applicantName || "이름 미입력"}</span>
        <span className="ml-[28px] max-md:ml-0">{applicantGender}</span>
        <span className="ml-[28px] max-md:ml-0">{application.phone || "연락처 미입력"}</span>
        {statusMeta ? (
          <div className="ml-auto flex items-center gap-[8px] pr-[8px] text-[14px] font-normal max-md:ml-0 max-md:w-full max-md:pr-0">
            <span className="text-[#6D7A8A]">현재 상태</span>
            <span
              className={`inline-flex h-[23px] items-center rounded-[999px] px-[10px] text-[12px] font-semibold leading-[1.253] ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        ) : null}
      </div>
      <p className="text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        접수일 {formatShortDate(application?.submittedAt)}
      </p>
      {application ? (
        <p className="mt-[4px] text-[12px] font-semibold leading-[1.253] text-[#8F7A6C]">
          신청번호 {formatApplicationDisplayCode(application.id, application.submittedAt)}
        </p>
      ) : null}

      <article className="mt-[13px] h-[calc(100vh_-_4.861vw_-_var(--app-69)_-_107px)] min-h-0 w-[var(--app-555)] overflow-y-auto rounded-[6px] border border-[#6D7A8A] bg-[#F9F9F9] px-[24px] py-[18px] max-md:h-auto max-md:w-full max-md:flex-1 max-md:px-4">
        <div className="grid grid-cols-[96px_minmax(0,1fr)_108px_108px] gap-x-[12px] border-b border-[#FE701E] pb-[22px] max-md:grid-cols-[80px_minmax(0,1fr)] max-md:gap-y-3">
          <div className="h-[96px] w-[96px] overflow-hidden rounded-[16px] bg-[#D9D9D9] max-md:size-20 max-md:rounded-md">
            {programImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${programTitle || "프로그램"} 대표 이미지`}
                className="h-full w-full object-cover"
                src={programImageUrl}
              />
            ) : null}
          </div>
          <div className="pt-[10px]">
            <h2 className="line-clamp-2 text-[18px] font-semibold leading-[1.35] text-[#5B3A29]">
              {programTitle || "프로그램 미선택"}
            </h2>
            <p className="mt-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
              {programLocation}
            </p>
            <p className="mt-[8px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
              {hostName}
            </p>
          </div>
          <div className="pt-[17px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] max-md:col-span-2 max-md:flex max-md:items-center max-md:gap-3 max-md:pt-0">
            <p>시작일</p>
            <p className="mt-[18px] whitespace-nowrap font-semibold max-md:mt-0">{startDate}</p>
          </div>
          <div className="pt-[17px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] max-md:col-span-2 max-md:flex max-md:items-center max-md:gap-3 max-md:pt-0">
            <p>종료일</p>
            <p className="mt-[18px] whitespace-nowrap font-semibold max-md:mt-0">{endDate}</p>
          </div>
        </div>

        <h3 className="mt-[24px] text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
          {formTitle}
        </h3>
        <p className="mt-[22px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          {formDescription}
        </p>
        <hr className="mt-[22px] border-[#FE701E]" />

        {previewBlocks.length > 0 ? (
          previewBlocks.map((block) => (
            <ApplicationResponseBlock
              answer={getAnswerForBlock(block, answerMap)}
              block={block}
              key={block.id}
            />
          ))
        ) : (
          <div className="mt-[22px] rounded-[6px] border border-dashed border-[#CAC4BC] bg-white px-[14px] py-[18px] text-[13px] font-normal leading-[1.6] text-[#6D7A8A]">
            아직 표시할 신청서 응답이 없습니다.
          </div>
        )}
      </article>
    </section>
  );
}

function SendMessageDialog({
  isScheduling,
  onClose,
  onRemoveRecipient,
  onSchedule,
  onScheduleDateChange,
  onScheduleTimeChange,
  onTemplateChange,
  recipients,
  scheduleDate,
  scheduleTime,
  selectedTemplateId,
  statusMessage,
  templates,
}: {
  isScheduling: boolean;
  onClose: () => void;
  onRemoveRecipient: (applicationId: string) => void;
  onSchedule: () => Promise<void>;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onTemplateChange: (templateId: string) => void;
  recipients: HostApplication[];
  scheduleDate: string;
  scheduleTime: string;
  selectedTemplateId: string;
  statusMessage: string;
  templates: MessageTemplate[];
}) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const previewRecipient = recipients[0];
  const canSchedule =
    Boolean(selectedTemplate) &&
    recipients.length > 0 &&
    Boolean(scheduleDate) &&
    Boolean(scheduleTime) &&
    !isScheduling;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-[24px] py-[24px] max-md:px-4 max-md:py-4 max-[359px]:px-3 max-[359px]:py-3">
      <section
        aria-labelledby="send-message-dialog-title"
        aria-modal="true"
        className="relative flex h-[clamp(635px,44.097vw,846.667px)] max-h-[calc(100vh-48px)] w-[clamp(457px,31.736vw,609.333px)] max-w-[calc(100vw-48px)] flex-col overflow-y-auto rounded-[8px] border border-[#D9D9D9] bg-white px-[20px] pb-[24px] pt-[49px] shadow-[0_18px_42px_rgba(13,13,12,0.12)] max-md:h-auto max-md:max-h-[calc(100dvh-32px)] max-md:w-full max-md:max-w-none max-md:px-4 max-md:pb-4 max-md:pt-14 max-[359px]:max-h-[calc(100dvh-24px)]"
        role="dialog"
      >
        <button
          aria-label="메시지 전송 닫기"
          className="absolute right-[17px] top-[18px] grid size-[30px] place-items-center text-[#0D0D0C] transition hover:text-[#FE701E] max-md:right-2 max-md:top-2 max-md:size-11"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-[24px]" strokeWidth={2} />
        </button>

        <div>
          <h2
            className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C] max-md:text-base"
            id="send-message-dialog-title"
          >
            메세지 전송
          </h2>
          <p className="mt-[13px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
            선택한 신청자에게 메시지를 발송해요
          </p>
        </div>

        <section className="mt-[22px]">
          <h3 className="text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
            수신자 ({String(recipients.length).padStart(2, "0")}명)
          </h3>
          <div className="ml-[20px] mt-[11px] h-[108px] overflow-y-auto pr-[2px] max-md:ml-0 max-md:h-auto max-md:max-h-40">
            {recipients.length > 0 ? (
              recipients.map((recipient) => (
                <div
                  className="grid h-[27px] grid-cols-[58px_47px_minmax(0,1fr)_14px] items-center border-b border-[#E9E9E9] px-[4px] text-[12px] font-medium leading-[1.253] text-[#6D7A8A] last:border-b-0 max-md:h-auto max-md:min-h-12 max-md:grid-cols-[minmax(0,1fr)_44px] max-md:gap-x-2 max-md:px-2 max-md:py-1"
                  key={recipient.id}
                >
                  <span className="truncate">{recipient.applicantName || "신청자"}</span>
                  <span className="truncate max-md:col-start-1 max-md:text-[11px]">
                    {getApplicationGenderLabel(recipient)}
                  </span>
                  <span className="truncate max-md:col-start-1 max-md:text-[11px]">
                    접수일 {formatShortDate(recipient.submittedAt)}
                  </span>
                  <button
                    aria-label={`${recipient.applicantName || "신청자"} 수신자 제거`}
                    className="ml-auto grid size-[22px] place-items-center rounded-full text-[#AEB8C2] transition hover:text-[#FE701E] max-md:col-start-2 max-md:row-span-3 max-md:row-start-1 max-md:size-11"
                    onClick={() => onRemoveRecipient(recipient.id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" strokeWidth={2} />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center rounded-[4px] border border-dashed border-[#D9D9D9] text-[12px] font-medium text-[#AEB8C2]">
                선택된 수신자가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="mt-[11px]">
          <h3 className="text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
            메세지 템플릿
          </h3>
          <div className="mt-[9px] grid gap-[8px]">
            {templates.map((template) => {
              const selected = template.id === selectedTemplate?.id;
              const renderedBody = previewRecipient
                ? renderMessageTemplate(template.body, previewRecipient)
                : template.body;

              return (
                <label
                  className={`grid cursor-pointer grid-cols-[14px_minmax(0,1fr)] items-start gap-[6px] max-md:min-h-11 max-md:grid-cols-[20px_minmax(0,1fr)] max-md:items-start max-md:gap-2 ${
                    selected ? "text-[#0D0D0C]" : "text-[#6D7A8A]"
                  }`}
                  key={template.id}
                >
                  <input
                    checked={selected}
                    className="mt-[8px] size-[12px] accent-[#FE701E] max-md:size-4"
                    onChange={() => onTemplateChange(template.id)}
                    type="radio"
                  />
                  <span
                    className={`overflow-hidden rounded-[4px] border ${
                      selected
                        ? "border-[#FF9A3D] bg-white"
                        : "border-[#AEB8C2] bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-[31px] items-center justify-between px-[12px] text-[12px] font-medium leading-[1.253] ${
                        selected
                          ? "bg-[#FF9A3D] text-white"
                          : "bg-white text-[#6D7A8A]"
                      }`}
                    >
                      <span className="truncate">{template.name}</span>
                      <span className="ml-[8px] shrink-0 font-normal">
                        작성일 미정
                      </span>
                    </span>
                    {selected ? (
                      <span className="block min-h-[37px] px-[12px] py-[10px] text-[12px] font-medium leading-[1.253] text-[#5B3A29]">
                        {renderedBody}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
            <Link
              className="ml-[14px] flex w-fit items-center gap-[4px] text-[12px] font-normal leading-[1.253] text-[#FF9A3D] max-md:ml-0 max-md:min-h-11 max-md:text-sm"
              href="/host/settings?panel=notifications"
            >
              <span className="grid size-[12px] place-items-center rounded-full bg-[#FF9A3D] text-[10px] font-semibold leading-none text-white">
                +
              </span>
              <span>새 템플릿 만들기</span>
            </Link>
          </div>
        </section>

        <section className="mt-[20px]">
          <h3 className="text-[14px] font-medium leading-[1.253] text-[#6D7A8A]">
            발송 일정
          </h3>
          <div className="mt-[8px] grid grid-cols-[minmax(0,242px)_75px] gap-[7px] max-md:grid-cols-1">
            <label className="relative">
              <input
                className="h-[36px] w-full rounded-[4px] border border-[#F7B267] bg-white px-[10px] pr-[34px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none max-md:h-11 max-md:text-base"
                onChange={(event) => onScheduleDateChange(event.target.value)}
                type="date"
                value={scheduleDate}
              />
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute right-[10px] top-1/2 size-[16px] -translate-y-1/2 text-[#6D7A8A]"
                strokeWidth={1.8}
              />
            </label>
            <input
              className="h-[36px] rounded-[4px] border border-[#F7B267] bg-white px-[8px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none max-md:h-11 max-md:w-full max-md:text-base"
              onChange={(event) => onScheduleTimeChange(event.target.value)}
              type="time"
              value={scheduleTime}
            />
          </div>
        </section>

        {statusMessage ? (
          <p className="mt-[10px] rounded-[4px] bg-[#FFF7F0] px-[9px] py-[7px] text-[10px] font-normal leading-[1.45] text-[#5B3A29]">
            {statusMessage}
          </p>
        ) : null}

        <button
          className="ml-auto mt-auto inline-flex h-[29px] min-w-[80px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[10px] text-[12px] font-semibold leading-[1.253] text-white disabled:cursor-not-allowed disabled:bg-[#D9D9D9] max-md:mt-5 max-md:min-h-11 max-md:w-full max-md:text-sm"
          disabled={!canSchedule}
          onClick={() => {
            void onSchedule();
          }}
          type="button"
        >
          {isScheduling ? (
            <Loader2 aria-hidden="true" className="size-[12px] animate-spin" />
          ) : (
            "전송 예약"
          )}
        </button>
      </section>
    </div>
  );
}

function StatusChangeDialog({
  applicationCount,
  onClose,
  onSubmit,
  onValueChange,
  value,
}: {
  applicationCount: number;
  onClose: () => void;
  onSubmit: () => void;
  onValueChange: (status: HostApplicationStatus) => void;
  value: HostApplicationStatus;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-[24px] max-md:px-4 max-[359px]:px-3">
      <section
        aria-labelledby="status-change-dialog-title"
        aria-modal="true"
        className="w-[420px] max-w-full rounded-[8px] bg-white px-[24px] py-[22px] shadow-[0_16px_45px_rgba(13,13,12,0.18)] max-md:max-h-[calc(100dvh-32px)] max-md:overflow-y-auto max-md:px-4"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-[18px]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FE701E]">
              Status
            </p>
            <h2
              className="mt-[8px] text-[20px] font-semibold leading-[1.253] text-[#0D0D0C]"
              id="status-change-dialog-title"
            >
              신청 상태 수정
            </h2>
            <p className="mt-[8px] text-[13px] font-normal leading-[1.55] text-[#6D7A8A]">
              선택한 {applicationCount}명의 신청 상태를 변경합니다.
            </p>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-[32px] items-center justify-center rounded-full border border-[#D9D9D9] text-[18px] leading-none text-[#6D7A8A] max-md:size-11 max-md:shrink-0"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-[20px] grid gap-[8px]">
          {applicationStatusOptions.map((option) => (
            <label
              className={`grid min-h-11 cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-[10px] rounded-[6px] border px-[12px] py-[10px] ${
                value === option.value
                  ? "border-[#FE701E] bg-[#FFF7F0]"
                  : "border-[#D9D9D9] bg-white"
              }`}
              key={option.value}
            >
              <input
                checked={value === option.value}
                className="mt-[2px] size-[14px] accent-[#FE701E]"
                onChange={() => onValueChange(option.value)}
                type="radio"
              />
              <span>
                <span className="block text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
                  {option.label}
                </span>
                <span className="mt-[4px] block text-[12px] font-normal leading-[1.45] text-[#6D7A8A]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-[22px] flex justify-end gap-[8px]">
          <button
            className="inline-flex h-[36px] items-center justify-center rounded-[4px] border border-[#D9D9D9] bg-white px-[14px] text-[13px] font-normal text-[#6D7A8A] max-md:min-h-11 max-md:flex-1 max-md:text-sm"
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className="inline-flex h-[36px] items-center justify-center rounded-[4px] bg-[#0D0D0C] px-[16px] text-[13px] font-semibold text-white max-md:min-h-11 max-md:flex-1 max-md:text-sm"
            onClick={onSubmit}
            type="button"
          >
            변경 적용
          </button>
        </div>
      </section>
    </div>
  );
}

function ApplicationResponseBlock({
  answer,
  block,
}: {
  answer?: SubmittedAnswer;
  block: ApplicationFormBlock;
}) {
  if (block.type === "title") {
    return (
      <h4 className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px] text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
        {block.label}
      </h4>
    );
  }

  if (block.type === "description") {
    return (
      <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
        <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
          {block.label}
        </p>
        <p className="mt-[12px] whitespace-pre-line text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
          {block.body || block.helper || "안내 내용이 없습니다."}
        </p>
      </div>
    );
  }

  if (block.type === "divider") {
    return <hr className="mt-[22px] border-dashed border-[#F3D7C4]" />;
  }

  if (block.type === "pageBreak") {
    return (
      <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px] text-[12px] font-semibold leading-[1.253] text-[#FE701E]">
        {block.label || "다음 페이지"}
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
        <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
          {block.label}
        </p>
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={block.imageAlt || block.label}
            className="mt-[14px] max-h-[260px] rounded-[6px] border border-[#F3D7C4] bg-white object-contain"
            src={block.imageUrl}
            style={{ width: `${block.imageWidth ?? 100}%` }}
          />
        ) : (
          <div className="mt-[14px] rounded-[6px] border border-dashed border-[#CAC4BC] bg-white px-[14px] py-[18px] text-[12px] text-[#6D7A8A]">
            이미지가 연결되지 않았습니다.
          </div>
        )}
        {block.helper ? (
          <p className="mt-[10px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
            {block.helper}
          </p>
        ) : null}
      </div>
    );
  }

  const helperText =
    block.type === "fileAttachment" || block.type === "fileRequest"
      ? block.body || block.helper
      : block.helper;

  return (
    <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
      <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
        {block.label || answer?.label || "질문"}
        {block.required ? (
          <span className="ml-[8px] text-[12px] text-[#FE701E]">*필수항목</span>
        ) : null}
      </p>
      {helperText ? (
        <p className="mt-[10px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
          {block.type === "fileAttachment" || block.type === "fileRequest"
            ? `〈${helperText}〉`
            : helperText}
        </p>
      ) : null}
      <ApplicationResponseControl answer={answer} block={block} />
    </div>
  );
}

function ApplicationResponseControl({
  answer,
  block,
}: {
  answer?: SubmittedAnswer;
  block: ApplicationFormBlock;
}) {
  const value = answer?.value;
  const displayValue = formatApplicationAnswer(value);

  if (block.type === "fileRequest") {
    const fileAnswer = asFileAnswer(value);

    return (
      <div className="mt-[14px] rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] py-[10px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
        {fileAnswer ? (
          <div className="flex items-center gap-[8px] text-[#5B3A29]">
            <FileText aria-hidden="true" className="shrink-0 text-[#FE701E]" size={16} />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {fileAnswer.fileName}
            </span>
            <span className="shrink-0 text-[#8A94A3]">
              {formatFileSize(fileAnswer.fileSize)}
            </span>
          </div>
        ) : (
          "첨부된 파일이 없습니다."
        )}
      </div>
    );
  }

  if (block.type === "fileAttachment") {
    const checked = isTruthyAnswer(value);

    return (
      <div className="mt-[14px] space-y-[12px]">
        <ApplicationAttachmentPreview block={block} />
        <label className="inline-flex min-h-[20px] items-center gap-[8px] px-[14px] text-[14px] font-normal leading-[1.253] text-[#5B3A29] max-md:min-h-11">
          <input
            checked={checked}
            className="size-[14px] accent-[#FE701E]"
            disabled
            readOnly
            type="checkbox"
          />
          {checked ? "확인 완료" : "확인 전"}
        </label>
      </div>
    );
  }

  if (block.type === "longText") {
    return (
      <textarea
        className="mt-[14px] min-h-[86px] w-full resize-none rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] py-[10px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] max-md:text-base"
        placeholder="응답 없음"
        readOnly
        value={displayValue}
      />
    );
  }

  if (block.type === "singleSelect") {
    return (
      <div className="relative mt-[14px] min-h-[34px] rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] py-[9px] pr-[42px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
        {displayValue || "응답 없음"}
        <span className="absolute right-[14px] top-1/2 h-[10px] w-[18px] -translate-y-1/2 rounded-b-full bg-[#FF9A3D]" />
      </div>
    );
  }

  if (block.type === "multiSelect" || (block.type === "checkbox" && (block.options?.length ?? 0) > 0)) {
    const selectedValues = answerValues(value);
    const options =
      block.options && block.options.length > 0
        ? block.options
        : selectedValues.length > 0
          ? selectedValues
          : ["응답 없음"];

    return (
      <div className="mt-[16px] grid grid-cols-2 gap-x-[58px] gap-y-[12px] px-[14px] text-[14px] font-normal leading-[1.253] text-[#5B3A29] max-sm:grid-cols-1 max-sm:gap-x-0 max-sm:px-0">
        {options.map((option, index) => {
          const checked = selectedValues.includes(option);
          return (
            <label className="inline-flex min-h-[20px] items-center gap-[8px] max-md:min-h-11" key={`${option}-${index}`}>
              <input
                checked={checked}
                className="size-[14px] accent-[#FE701E]"
                disabled
                readOnly
                type="checkbox"
              />
              <span className={checked ? "text-[#5B3A29]" : "text-[#AEB8C2]"}>
                {option}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (block.type === "checkbox") {
    const checked = isTruthyAnswer(value);
    return (
      <label className="mt-[16px] inline-flex min-h-[20px] items-center gap-[8px] px-[14px] text-[14px] font-normal leading-[1.253] text-[#5B3A29] max-md:min-h-11">
        <input
          checked={checked}
          className="size-[14px] accent-[#FE701E]"
          disabled
          readOnly
          type="checkbox"
        />
        {checked ? "동의함" : "동의하지 않음"}
      </label>
    );
  }

  return (
    <input
      className="mt-[14px] h-[30px] w-full rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] max-md:h-11 max-md:text-base"
      inputMode={block.type === "phone" ? "tel" : "text"}
      placeholder="응답 없음"
      readOnly
      value={displayValue}
    />
  );
}

function PaymentManagementPanel({
  applications,
  messagesHref,
  onSelect,
  selectedApplication,
}: {
  applications: HostApplication[];
  messagesHref: string;
  onSelect: (applicationId: string) => void;
  selectedApplication?: HostApplication;
}) {
  const paidApplications = applications.filter((application) => application.paymentAmount > 0);
  const endedApplications = applications.filter((application) =>
    ["completed", "rejected"].includes(application.status),
  );

  return (
    <section className="grid min-h-[calc(100vh_-_4.861vw)] grid-cols-[16.042vw_minmax(0,1fr)_21.944vw] bg-white">
      <aside className="border-r border-[#6D7A8A] px-[1.389vw] pt-[1.25vw]">
        <div className="flex h-[23px] gap-[6px]">
          {[
            ["전체", applications.length],
            ["진행", paidApplications.length],
            ["종료", endedApplications.length],
          ].map(([label], index) => (
            <button
              className={`h-[20px] rounded-[999px] px-[13px] text-[12px] font-semibold leading-[1.253] text-white ${
                index === 0 ? "bg-[#FF9A3D]" : "bg-[#CAC4BC]"
              }`}
              key={label}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-[8px] grid gap-[7px]">
          {applications.length > 0 ? (
            applications.slice(0, 8).map((application, index) => (
              <button
                className={`grid h-[50px] grid-cols-[40px_minmax(0,1fr)_48px] items-center rounded-[10px] border px-[6px] text-left ${
                  application.id === selectedApplication?.id
                    ? "border-[#FE701E] bg-white"
                    : "border-transparent bg-[#F3F3F3]"
                }`}
                key={application.id}
                onClick={() => onSelect(application.id)}
                type="button"
              >
                <span className="size-[36px] rounded-full bg-[#D9D9D9]" />
                <span className="min-w-0 pl-[8px]">
                  <span className="block truncate text-[14px] font-semibold leading-[1.253] text-[#6D7A8A]">
                    {application.applicantName || "게스트명"}
                  </span>
                  <span className="mt-[2px] block truncate text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
                    {application.receiptCount > 0 ? "증빙 확인" : "결제 확인"}
                  </span>
                </span>
                <span className="justify-self-end text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
                  {index === 0 ? "3분전" : application.paymentAmount > 0 ? "진행" : "대기"}
                </span>
              </button>
            ))
          ) : (
            <div className="flex h-[50px] items-center rounded-[10px] bg-[#F3F3F3] px-[10px] text-[12px] font-semibold text-[#6D7A8A]">
              결제 상담 내역이 없습니다.
            </div>
          )}
        </div>
      </aside>

      <section className="relative border-r border-[#6D7A8A] bg-white">
        <Link
          className="absolute right-[28px] top-[17px] text-[16px] font-semibold leading-[1.253] text-[#6D7A8A]"
          href={messagesHref}
        >
          전체 메시지함 -&gt;
        </Link>
        <span className="absolute right-[52px] top-[52px] size-[18px] rounded-full border-[2px] border-[#CAC4BC]" />

        <div className="mx-auto mt-[96px] w-[25.347vw] max-w-[487px] rounded-[12px] border border-[#D9D9D9] bg-[#FCFCFC] px-[18px] py-[21px]">
          <p className="text-[14px] font-semibold leading-[1.45] text-[#0D0D0C]">
            호스트가 입력한 첫인사 텍스트가 쓰여질 공간 입니다
            <br />
            ex) 안녕하세요 ㅇㅇㅇ에 관심 가져주셔서 감사해요.
            <br />
            궁금한 점이 있으시면 아래 항목을 눌러보세요 :)
          </p>
          <div className="mt-[18px] grid gap-[7px]">
            {["집합 장소 및 시간 안내", "준비물과 복장 안내", "취소 및 환불 규정 안내", "호스트와 직접 소통하기"].map((label, index) => (
              <button
                className={`h-[30px] rounded-[6px] border border-[#FF9A3D] bg-white text-[14px] font-normal leading-[1.253] ${
                  index === 3 ? "text-[#FE701E]" : "text-[#6D7A8A]"
                }`}
                key={label}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-[10px] left-[17px] right-[34px] flex h-[36px] items-center rounded-[999px] border border-[#FE701E] bg-white px-[10px] text-[14px] font-normal leading-[1.253] text-[#D9D9D9]">
          <span className="mr-[8px] flex size-[12px] items-center justify-center rounded-full bg-[#FF9A3D] text-[10px] font-semibold text-white">
            +
          </span>
          메시지 입력
        </div>
      </section>

      <aside className="px-[1.25vw] pt-[1.25vw]">
        <div className="mx-auto size-[42px] rounded-full bg-[#D9D9D9]" />
        <div className="mt-[26px] grid gap-[18px] text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
          <p>게스트명 : {selectedApplication?.applicantName ?? ""}</p>
          <p>예약정보 : {selectedApplication ? "예약 확정" : ""}</p>
        </div>
        <button
          className="mt-[20px] h-[30px] w-full rounded-[4px] bg-[#CAC4BC] text-[14px] font-semibold leading-[1.253] text-white"
          type="button"
        >
          상담 종료
        </button>

        <h2 className="mt-[17px] text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
          이전 상담 내역
        </h2>
        <div className="mt-[9px] grid gap-[7px]">
          {applications.slice(0, 3).map((application) => (
            <div
              className="flex h-[32px] items-center justify-between rounded-[4px] border border-[#6D7A8A] px-[10px] text-[14px] font-semibold leading-[1.253] text-[#6D7A8A]"
              key={application.id}
            >
              <span className="max-w-[170px] truncate">
                {formatProgramDisplayName(application.programTitle, application.programId)}
              </span>
              <span>{formatShortDate(application.submittedAt)}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function ReviewManagementPanel({
  errorMessage,
  isLoading,
  onRatingFilterChange,
  onSortOrderChange,
  onToggleVisibility,
  onVisibilityFilterChange,
  ratingFilter,
  reviews,
  sortOrder,
  statusMessage,
  updatingReviewId,
  visibilityFilter,
}: {
  errorMessage: string;
  isLoading: boolean;
  onRatingFilterChange: (filter: ReviewRatingFilter) => void;
  onSortOrderChange: (order: ReviewSortOrder) => void;
  onToggleVisibility: (review: HostReviewManagementItem, hidden: boolean) => void;
  onVisibilityFilterChange: (filter: ReviewVisibilityFilter) => void;
  ratingFilter: ReviewRatingFilter;
  reviews: HostReviewManagementItem[];
  sortOrder: ReviewSortOrder;
  statusMessage: string;
  updatingReviewId: string | null;
  visibilityFilter: ReviewVisibilityFilter;
}) {
  const reviewPool = useMemo(
    () => reviews.filter((review) => review.status !== "deleted"),
    [reviews],
  );
  const averageRating = getAverageReviewRating(reviewPool);
  const filteredReviews = useMemo(
    () =>
      sortHostReviews(
        reviewPool.filter(
          (review) =>
            matchesReviewRatingFilter(review, ratingFilter) &&
            matchesReviewVisibilityFilter(review, visibilityFilter),
        ),
        sortOrder,
      ),
    [ratingFilter, reviewPool, sortOrder, visibilityFilter],
  );

  return (
    <section className="min-h-[calc(100vh_-_4.861vw)] bg-white pl-[2.778vw] pt-[47px]">
      <div className="w-[61.042vw] max-w-[1172px]">
        <h1 className="text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
          전체 후기 {reviewPool.length}개 / 평균{" "}
          <span className="inline-flex items-center gap-[3px] text-[#0D0D0C]">
            <Flame
              aria-hidden="true"
              className="size-[14px] fill-[#0D0D0C] text-[#0D0D0C]"
              strokeWidth={1.8}
            />
            {averageRating}
          </span>
        </h1>

        <div className="mt-[26px] grid gap-[12px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          <div className="flex items-center gap-[13px]">
            <span className="shrink-0">평점</span>
            {reviewRatingFilterOptions.map((option) => (
              <label className="inline-flex items-center gap-[4px]" key={option.key}>
                <input
                  checked={ratingFilter === option.value}
                  className="size-[14px] accent-[#FE701E]"
                  onChange={() => onRatingFilterChange(option.value)}
                  type="radio"
                />
                <span className="inline-flex items-center gap-[2px]">
                  {option.label}
                  {option.value !== "all" ? (
                    <FlameRating rating={option.value} tone="muted" />
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-[20px]">
            <span className="shrink-0">순서</span>
            <label className="inline-flex items-center gap-[4px]">
              <input
                checked={sortOrder === "latest"}
                className="size-[14px] accent-[#FE701E]"
                onChange={() => onSortOrderChange("latest")}
                type="radio"
              />
              최신순
            </label>
            <label className="inline-flex items-center gap-[4px]">
              <input
                checked={sortOrder === "oldest"}
                className="size-[14px] accent-[#FE701E]"
                onChange={() => onSortOrderChange("oldest")}
                type="radio"
              />
              오래된순
            </label>
          </div>
          <div className="flex items-center gap-[14px]">
            {reviewVisibilityFilterOptions.map((option) => (
              <button
                className={
                  visibilityFilter === option.value
                    ? "font-semibold text-[#0D0D0C]"
                    : "font-normal text-[#CAC4BC]"
                }
                key={option.value}
                onClick={() => onVisibilityFilterChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="mt-[13px] border-[#CAC4BC]" />

        {statusMessage || errorMessage ? (
          <div className="mt-[14px] text-[12px] font-semibold leading-[1.253]">
            {statusMessage ? <p className="text-[#FE701E]">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-red-600">{errorMessage}</p> : null}
          </div>
        ) : null}

        <div className="mt-[28px] grid w-[54.792vw] max-w-[1052px] gap-[14px] pb-[40px]">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <ReviewManagementCard
                disabled={updatingReviewId === String(review.id)}
                key={review.id}
                onToggleVisibility={onToggleVisibility}
                review={review}
              />
            ))
          ) : isLoading ? (
            <div className="flex h-[160px] items-center justify-center rounded-[6px] border border-[#6D7A8A] text-[14px] font-semibold text-[#6D7A8A]">
              후기를 불러오는 중입니다.
            </div>
          ) : (
            <div className="flex h-[160px] items-center justify-center rounded-[6px] border border-[#6D7A8A] text-[14px] font-semibold text-[#6D7A8A]">
              조건에 맞는 후기가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FlameRating({
  rating,
  tone = "orange",
}: {
  rating: number;
  tone?: "muted" | "orange";
}) {
  const activeClassName =
    tone === "orange"
      ? "fill-[#FE701E] text-[#FE701E]"
      : "fill-[#6D7A8A] text-[#6D7A8A]";
  const inactiveClassName = "fill-transparent text-[#AEB8C2]";

  return (
    <span className="inline-flex items-center gap-[1px]">
      {Array.from({ length: rating }, (_, index) => (
        <Flame
          aria-hidden="true"
          className={`size-[12px] ${index < rating ? activeClassName : inactiveClassName}`}
          key={index}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}

function ReviewManagementCard({
  disabled,
  onToggleVisibility,
  review,
}: {
  disabled: boolean;
  onToggleVisibility: (review: HostReviewManagementItem, hidden: boolean) => void;
  review: HostReviewManagementItem;
}) {
  const body = review.body || review.excerpt || "후기 내용이 없습니다.";
  const images = review.images ?? [];
  const rating = getReviewRating(review);
  const hidden = isHostReviewHidden(review);

  return (
    <article className="rounded-[6px] border border-[#6D7A8A] bg-white px-[34px] py-[29px]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
            {review.author || "작성자"}
          </h2>
          <p className="mt-[9px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            {formatReviewManagementDate(
              review.date || review.publishedAt || review.submittedAt || review.updatedAt,
            )}{" "}
            <span className="ml-[6px] inline-flex items-center gap-[2px] text-[#FE701E]">
              <Flame
                aria-hidden="true"
                className="size-[11px] fill-[#FE701E] text-[#FE701E]"
                strokeWidth={1.8}
              />
              {rating.toFixed(1)}
            </span>
          </p>
        </div>
        <button
          className="h-[21px] rounded-[999px] border border-[#6D7A8A] px-[10px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-wait disabled:opacity-50"
          disabled={disabled}
          onClick={() => onToggleVisibility(review, !hidden)}
          type="button"
        >
          {hidden ? "숨김해제" : "숨김처리"}
        </button>
      </div>

      <p className="mt-[18px] text-[12px] font-normal leading-[1.55] text-[#0D0D0C]">
        {body}
      </p>

      <div className="mt-[10px] flex gap-[6px]">
        {Array.from({ length: 5 }).map((_, imageIndex) => {
          const image = images[imageIndex];
          return (
            <div
              className="h-[78px] w-[78px] rounded-[6px] bg-[#D9D9D9] bg-cover bg-center"
              key={`${review.id}-image-${imageIndex}`}
              style={image ? { backgroundImage: `url("${image}")` } : undefined}
            />
          );
        })}
      </div>

      <div className="mt-[14px] border-t border-[#D9D9D9]" />
    </article>
  );
}

type SubmittedAnswer = {
  id: string;
  label: string;
  type: string;
  value: unknown;
};

type FileAnswer = {
  fileName: string;
  fileSize: number;
  fileType?: string;
};

function resolveApplicationTemplate(
  application: HostApplication | undefined,
  templates: ApplicationFormTemplate[],
  routeProgramId: string,
  routeProgramTitle: string,
): ApplicationFormTemplate | undefined {
  if (!application) return undefined;

  const snapshotTemplate = normalizeApplicationSnapshotTemplate(
    application.formSnapshot,
  );
  if (snapshotTemplate) return snapshotTemplate;

  const answers = application.answers ?? {};
  const exactTemplateIds = [
    application.formId,
    asString(answers.templateId),
  ].filter(Boolean);
  const exactTemplate = templates.find((template) =>
    exactTemplateIds.includes(template.id),
  );
  if (exactTemplate) return exactTemplate;

  const programIdentifiers = [
    application.programId,
    routeProgramId,
    application.programTitle,
    routeProgramTitle,
  ].filter(Boolean);

  return templates.find((template) => {
    return programIdentifiers.some(
      (identifier) =>
        identifiersMatch(template.programId, identifier) ||
        identifiersMatch(template.programTitle, identifier),
    );
  });
}

function normalizeApplicationSnapshotTemplate(
  snapshot: Record<string, unknown> | undefined,
): ApplicationFormTemplate | undefined {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return undefined;
  }

  const template = normalizeApplicationFormTemplateShape({
    blocks: snapshot.blocks,
    description: snapshot.description,
    fields: snapshot.fields,
    formKind: snapshot.formKind,
    id: asString(snapshot.sourceFormId) || asString(snapshot.id),
    name: snapshot.name,
    programId: snapshot.programId,
    programTitle: snapshot.programTitle,
    updatedAt: snapshot.updatedAt,
  });

  return template.blocks.length > 0 || template.fields.length > 0
    ? template
    : undefined;
}

function buildApplicationAnswerMap(
  answers: Record<string, unknown>,
): Map<string, SubmittedAnswer> {
  const answerMap = new Map<string, SubmittedAnswer>();

  for (const answer of [
    ...asAnswerArray(answers.templateAnswers),
    ...asAnswerArray(answers.blockAnswers),
  ]) {
    const label = asString(answer.label);
    const id = asString(answer.id) || label;
    if (!id && !label) continue;

    const entry = {
      id,
      label: label || id,
      type: asString(answer.type),
      value: answer.value,
    };
    answerMap.set(id, entry);
    if (label) answerMap.set(label, entry);
  }

  return answerMap;
}

function buildFallbackBlocksFromAnswers(
  answers: Record<string, unknown>,
): ApplicationFormBlock[] {
  const submittedAnswers = collectSubmittedAnswers(answers);

  return submittedAnswers.map((answer, index) => ({
    id: answer.id || `answer-${index}`,
    label: answer.label || `질문 ${index + 1}`,
    options: answerValues(answer.value),
    required: false,
    type: submittedAnswerTypeToBlockType(answer.type, answer.value),
  }));
}

function collectSubmittedAnswers(
  answers: Record<string, unknown>,
): SubmittedAnswer[] {
  const blockAnswers = asAnswerArray(answers.blockAnswers);
  if (blockAnswers.length > 0) {
    return blockAnswers.map((answer, index) => ({
      id: asString(answer.id) || `block-answer-${index}`,
      label: asString(answer.label) || `질문 ${index + 1}`,
      type: asString(answer.type),
      value: answer.value,
    }));
  }

  const templateAnswers = asAnswerArray(answers.templateAnswers);
  if (templateAnswers.length > 0) {
    return templateAnswers.map((answer, index) => ({
      id: asString(answer.id) || `template-answer-${index}`,
      label: asString(answer.label) || `질문 ${index + 1}`,
      type: asString(answer.type),
      value: answer.value,
    }));
  }

  return Object.entries(answers)
    .filter(([key, value]) => {
      if (
        [
          "blockAnswers",
          "companions",
          "legalConsent",
          "memo",
          "templateAnswers",
          "templateId",
          "templateName",
        ].includes(key)
      ) {
        return false;
      }
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: humanizeAnswerKey(key),
      type: Array.isArray(value) ? "multiSelect" : typeof value,
      value,
    }));
}

function getAnswerForBlock(
  block: ApplicationFormBlock,
  answerMap: Map<string, SubmittedAnswer>,
): SubmittedAnswer | undefined {
  if (!isQuestionBlock(block)) return undefined;
  return answerMap.get(block.id) ?? answerMap.get(block.label);
}

function findAnswerTextByLabels(
  answerMap: Map<string, SubmittedAnswer>,
  labels: string[],
): string {
  for (const label of labels) {
    const answer = answerMap.get(label);
    const value = answer ? formatApplicationAnswer(answer.value).trim() : "";
    if (value) return value;
  }

  return "";
}

function getApplicationGenderLabel(application: HostApplication): string {
  const answerMap = buildApplicationAnswerMap(application.answers ?? {});
  return findAnswerTextByLabels(answerMap, ["성별", "gender"]) || "성별 미입력";
}

function submittedAnswerTypeToBlockType(
  type: string,
  value: unknown,
): ApplicationFormBlock["type"] {
  if (
    [
      "checkbox",
      "date",
      "email",
      "fileAttachment",
      "fileRequest",
      "longText",
      "multiSelect",
      "phone",
      "shortText",
      "singleSelect",
    ].includes(type)
  ) {
    return type as ApplicationFormBlock["type"];
  }
  if (Array.isArray(value)) return "multiSelect";
  if (typeof value === "boolean") return "checkbox";
  return "shortText";
}

function answerValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatApplicationAnswer(item))
      .filter((item) => item.trim().length > 0);
  }
  const singleValue = formatApplicationAnswer(value);
  return singleValue ? [singleValue] : [];
}

function formatApplicationAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatApplicationAnswer).join(", ");
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "number") return value.toLocaleString("ko-KR");
  if (typeof value === "string") return value;
  const fileAnswer = asFileAnswer(value);
  if (fileAnswer) {
    return `${fileAnswer.fileName} (${formatFileSize(fileAnswer.fileSize)})`;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return "";
}

function ApplicationAttachmentPreview({
  block,
}: {
  block: ApplicationFormBlock;
}) {
  const fileUrl = block.fileUrl?.trim();
  const fileName = block.fileName?.trim() || block.imageAlt?.trim() || "첨부 파일";
  const isImageAttachment = Boolean(
    fileUrl && /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(fileUrl),
  );

  if (fileUrl && isImageAttachment) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={fileName}
        className="h-[188px] w-[320px] max-w-full rounded-[2px] bg-[#D9D9D9] object-cover"
        src={fileUrl}
      />
    );
  }

  return (
    <div className="flex h-[188px] w-[320px] max-w-full flex-col items-center justify-center gap-[10px] rounded-[2px] bg-[#D9D9D9] px-[18px] text-center text-[12px] font-medium leading-[1.45] text-[#6D7A8A]">
      <FileText aria-hidden="true" size={28} strokeWidth={1.8} />
      <span className="line-clamp-2">{fileName}</span>
      {fileUrl ? <span className="text-[11px] text-[#8A94A3]">다운로드 가능한 파일</span> : null}
    </div>
  );
}

function asFileAnswer(value: unknown): FileAnswer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const answer = value as Partial<FileAnswer>;
  if (typeof answer.fileName !== "string" || typeof answer.fileSize !== "number") {
    return undefined;
  }
  return {
    fileName: answer.fileName,
    fileSize: answer.fileSize,
    fileType: answer.fileType,
  };
}

function formatFileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024)).toLocaleString("ko-KR")} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isTruthyAnswer(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "yes", "y", "1", "동의", "동의함", "예"].includes(
      value.trim().toLowerCase(),
    );
  }
  return Boolean(value);
}

function asAnswerArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function humanizeAnswerKey(key: string): string {
  const labels: Record<string, string> = {
    motivation: "지원 동기",
    receiptPlan: "증빙 계획",
    workStyle: "업무 방식",
  };

  return labels[key] ?? key;
}

function identifiersMatch(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  return left === right || normalizeIdentifier(left) === normalizeIdentifier(right);
}

async function persistApplicationStatus(
  applicationId: string,
  status: HostApplicationStatus,
) {
  if (!isUuid(applicationId)) return;

  await fetch(`/api/host/applications/${applicationId}`, {
    body: JSON.stringify({ status }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  }).catch(() => undefined);
}

function matchesReviewTab(application: HostApplication, tab: ReviewTab) {
  if (tab === "all") return true;
  if (tab === "pending") {
    return application.status === "submitted" || application.status === "screening";
  }
  if (tab === "accepted") {
    return ["accepted", "checkedIn", "completed"].includes(application.status);
  }
  return application.status === "rejected";
}

function matchesProgramIdentifier(application: HostApplication, programId: string) {
  const normalizedProgramId = normalizeIdentifier(programId);
  return (
    normalizeIdentifier(application.programId ?? "") === normalizedProgramId ||
    normalizeIdentifier(application.programTitle) === normalizedProgramId
  );
}

function matchesHostReviewProgram(
  review: HostReviewManagementItem,
  {
    program,
    programId,
    programTitle,
    scopedApplications,
  }: {
    program?: HostProgramOverview;
    programId: string;
    programTitle: string;
    scopedApplications: HostApplication[];
  },
) {
  const scopedApplicationIds = new Set(scopedApplications.map((application) => application.id));
  if (review.applicationId && scopedApplicationIds.has(review.applicationId)) return true;

  const programIdentifiers = [
    programId,
    program?.id,
    program?.slug,
    program?.title,
    programTitle,
    programTitle ? hostProgramId(programTitle) : "",
  ].filter((identifier): identifier is string => Boolean(identifier));

  if (programIdentifiers.length === 0) return true;

  const reviewIdentifiers = [
    review.programUuid,
    review.programSlug,
    review.programTitle,
    review.programLegacyId !== undefined ? String(review.programLegacyId) : "",
  ].filter((identifier): identifier is string => Boolean(identifier));

  if (reviewIdentifiers.length === 0) return false;

  return reviewIdentifiers.some((reviewIdentifier) =>
    programIdentifiers.some((programIdentifier) =>
      identifiersMatch(reviewIdentifier, programIdentifier),
    ),
  );
}

function getAverageReviewRating(reviews: HostReviewManagementItem[]) {
  const ratings = reviews.map(getReviewRating);
  if (ratings.length === 0) return "0.0";

  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return average.toFixed(1);
}

function matchesReviewRatingFilter(
  review: HostReviewManagementItem,
  ratingFilter: ReviewRatingFilter,
) {
  if (ratingFilter === "all") return true;
  return Math.round(getReviewRating(review)) === ratingFilter;
}

function matchesReviewVisibilityFilter(
  review: HostReviewManagementItem,
  visibilityFilter: ReviewVisibilityFilter,
) {
  if (visibilityFilter === "all") return true;
  if (visibilityFilter === "hidden") return isHostReviewHidden(review);
  return !isHostReviewHidden(review) && !hasHostReviewReply(review);
}

function sortHostReviews(
  reviews: HostReviewManagementItem[],
  sortOrder: ReviewSortOrder,
) {
  return [...reviews].sort((left, right) => {
    const leftTime = getReviewTime(left);
    const rightTime = getReviewTime(right);
    return sortOrder === "latest" ? rightTime - leftTime : leftTime - rightTime;
  });
}

function getReviewRating(review: HostReviewManagementItem) {
  const rating =
    typeof review.rating === "number" && Number.isFinite(review.rating)
      ? review.rating
      : 5;
  return Math.min(5, Math.max(1, rating));
}

function getReviewTime(review: HostReviewManagementItem) {
  const value =
    review.publishedAt ||
    review.submittedAt ||
    review.date ||
    review.updatedAt ||
    "";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isHostReviewHidden(review: HostReviewManagementItem) {
  return review.status === "hidden" || review.published === false;
}

function hasHostReviewReply(review: HostReviewManagementItem) {
  const maybeReply = review as HostReviewManagementItem & {
    hostReply?: unknown;
    hostReplyId?: unknown;
    reply?: unknown;
    replyStatus?: unknown;
  };

  return Boolean(
    maybeReply.hostReply ||
      maybeReply.hostReplyId ||
      maybeReply.reply ||
      maybeReply.replyStatus === "published",
  );
}

function getReviewStatus(status: HostApplicationStatus) {
  if (status === "rejected") {
    return { className: "bg-[#6D7A8A] text-white", label: "거절" };
  }
  if (status === "submitted" || status === "screening") {
    return { className: "bg-[#FFB45F] text-white", label: "검토대기" };
  }
  return { className: "bg-[#7A8B52] text-white", label: "승인" };
}

function getApplicationStatusMeta(status: HostApplicationStatus) {
  if (status === "rejected") {
    return { className: "bg-[#6D7A8A] text-white", label: "거절" };
  }
  if (status === "accepted") {
    return { className: "bg-[#7A8B52] text-white", label: "승인" };
  }
  if (status === "checkedIn") {
    return { className: "bg-[#1D70D6] text-white", label: "참여중" };
  }
  if (status === "completed") {
    return { className: "bg-[#0D0D0C] text-white", label: "완료" };
  }
  return { className: "bg-[#FFB45F] text-white", label: "검토대기" };
}

function getMessageStatus(status: HostApplicationStatus) {
  if (status === "accepted") {
    return { dotClassName: "bg-[#FE701E]", label: "전송" };
  }
  if (status === "checkedIn" || status === "completed") {
    return { dotClassName: "bg-[#1D70D6]", label: "예약중" };
  }
  return { dotClassName: "bg-[#CAC4BC]", label: "전송전" };
}

function formatShortDate(value?: string) {
  if (!value) return "미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "미정";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function formatReviewManagementDate(value?: string) {
  if (!value) return "날짜 미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미정";

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatApplicationPanelDate(value?: string) {
  if (!value) return "날짜 미입력";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미입력";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}년 ${month}월 ${day}일`;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "-");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
