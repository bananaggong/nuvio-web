"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
  findHostProgramOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import type {
  HostApplication,
  HostApplicationStatus,
} from "@/lib/host-operations";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type ReviewTab = "all" | "pending" | "accepted" | "rejected";

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

export function HostApplicationsCrm({
  programId,
  projectId,
}: {
  programId?: string;
  projectId?: string;
}) {
  const { applications, programs: hostPrograms, reportProjects, setApplications } =
    useHostOperationsData();
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");

  const project = useMemo(() => {
    if (!projectId) return undefined;
    return findHostProjectOverview(projectId, applications, reportProjects, hostPrograms);
  }, [applications, hostPrograms, projectId, reportProjects]);
  const program = useMemo(() => {
    if (projectId && programId) {
      return findHostProgramOverview(
        projectId,
        programId,
        applications,
        reportProjects,
        hostPrograms,
      );
    }
    if (programId) {
      return findStandaloneHostProgramOverview(
        programId,
        applications,
        reportProjects,
        hostPrograms,
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
  const selectedApplication =
    filteredApplications.find((application) => application.id === selectedApplicationId) ??
    filteredApplications[0] ??
    scopedApplications[0];
  const resolvedProgramBasePath = programBasePath ?? projectBasePath ?? "/host/programs";
  const applicationsHref = `${resolvedProgramBasePath}/applications`;
  const formsHref = `${resolvedProgramBasePath}/forms`;
  const messagesHref = `${resolvedProgramBasePath}/messages`;
  const sidebarTitle =
    program?.title ?? selectedApplication?.programTitle ?? project?.title ?? "프로그램 제목";
  const sidebarProgramId = program?.id ?? programId ?? selectedApplication?.programId ?? "";

  function updateApplicationStatus(
    applicationId: string,
    status: HostApplicationStatus,
  ) {
    const next = applications.map((application) =>
      application.id === applicationId ? { ...application, status } : application,
    );

    setApplications(next);
    void persistApplicationStatus(applicationId, status);
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh_-_4.861vw)] bg-white text-[#5B3A29]"
      style={applicationFigmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh_-_4.861vw)] max-md:flex-col">
        <ApplicationSidebar
          activeItem="applications"
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          programId={sidebarProgramId}
          programPath={resolvedProgramBasePath}
          status="모집 진행중"
          title={sidebarTitle}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <main className="flex min-h-[calc(100vh_-_4.861vw_-_var(--app-69))] flex-1 bg-white">
            <ApplicationListPanel
              activeTab={activeTab}
              applications={filteredApplications}
              onSelect={(applicationId) => setSelectedApplicationId(applicationId)}
              onTabChange={setActiveTab}
              selectedApplicationId={selectedApplication?.id ?? ""}
            />
            <ApplicationDetailPanel
              application={selectedApplication}
              programTitle={sidebarTitle}
              onStatusChange={updateApplicationStatus}
            />
          </main>

          <div className="flex h-[var(--app-69)] shrink-0 border-t border-[#6D7A8A] bg-white pl-[var(--app-29)] pt-[var(--app-20)]">
            <button
              className="inline-flex h-[var(--app-29)] w-[var(--app-91)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E]"
              type="button"
            >
              메시지 전송
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ApplicationListPanel({
  activeTab,
  applications,
  onSelect,
  onTabChange,
  selectedApplicationId,
}: {
  activeTab: ReviewTab;
  applications: HostApplication[];
  onSelect: (applicationId: string) => void;
  onTabChange: (tab: ReviewTab) => void;
  selectedApplicationId: string;
}) {
  return (
    <section className="w-[var(--app-625)] shrink-0 border-r border-[#6D7A8A] bg-white">
      <div className="ml-[var(--app-40)] mt-[var(--app-47)] w-[var(--app-577)] border-b border-[#CAC4BC]">
        <div className="flex h-[27px] items-start gap-[12px]">
          {reviewTabs.map((tab) => (
            <button
              className={`relative h-[27px] text-[14px] leading-[1.253] ${
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

      <div className="ml-[var(--app-40)] mt-[23px] grid w-[var(--app-577)] gap-[9px]">
        {applications.length > 0 ? (
          applications.map((application) => (
            <ApplicationRow
              application={application}
              key={application.id}
              onSelect={onSelect}
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
  onSelect,
  selected,
}: {
  application: HostApplication;
  onSelect: (applicationId: string) => void;
  selected: boolean;
}) {
  const reviewStatus = getReviewStatus(application.status);
  const messageStatus = getMessageStatus(application.status);

  return (
    <button
      className={`grid h-[34px] w-full grid-cols-[22px_112px_70px_160px_84px_minmax(0,1fr)] items-center text-left text-[14px] leading-[1.253] ${
        selected ? "bg-[#F3F3F3]" : "bg-white"
      }`}
      onClick={() => onSelect(application.id)}
      type="button"
    >
      <span className="ml-[6px] size-[14px] border border-[#6D7A8A] bg-white" />
      <span className="truncate font-semibold text-[#0D0D0C]">
        {application.applicantName || "신청자이름"}
      </span>
      <span className="font-semibold text-[#0D0D0C]">성별</span>
      <span className="font-normal text-[#6D7A8A]">
        접수일 {formatShortDate(application.submittedAt)}
      </span>
      <span
        className={`inline-flex h-[21px] w-fit items-center rounded-[6px] px-[8px] text-[12px] font-semibold leading-[1.253] ${reviewStatus.className}`}
      >
        {reviewStatus.label}
      </span>
      <span className="flex items-center justify-end gap-[3px] pr-[8px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
        <span className={`size-[4px] rounded-full ${messageStatus.dotClassName}`} />
        {messageStatus.label}
      </span>
    </button>
  );
}

function ApplicationDetailPanel({
  application,
  onStatusChange,
  programTitle,
}: {
  application?: HostApplication;
  onStatusChange: (applicationId: string, status: HostApplicationStatus) => void;
  programTitle: string;
}) {
  const approveChecked = application
    ? ["accepted", "checkedIn", "completed"].includes(application.status)
    : false;
  const rejectChecked = application?.status === "rejected";

  return (
    <section className="min-w-0 flex-1 bg-white pl-[var(--app-20)] pr-[11px] pt-[var(--app-52)]">
      <div className="flex h-[28px] items-start text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
        <span>{application?.applicantName ?? "신청자이름"}</span>
        <span className="ml-[28px]">성별</span>
        <span className="ml-[28px]">{application?.phone || "010 - 0000 - 0000"}</span>
        {application ? (
          <div className="ml-auto flex items-center gap-[14px] pr-[8px] text-[14px] font-normal">
            <label className="inline-flex items-center gap-[6px]">
              <input
                checked={approveChecked}
                className="size-[14px] accent-[#FE701E]"
                onChange={() => onStatusChange(application.id, "accepted")}
                type="radio"
              />
              <span className="text-[#FE701E]">승인</span>
            </label>
            <label className="inline-flex items-center gap-[6px]">
              <input
                checked={rejectChecked}
                className="size-[14px] accent-[#6D7A8A]"
                onChange={() => onStatusChange(application.id, "rejected")}
                type="radio"
              />
              <span className="text-[#6D7A8A]">거절</span>
            </label>
          </div>
        ) : null}
      </div>
      <p className="text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
        접수일 {formatShortDate(application?.submittedAt)}
      </p>

      <article className="mt-[13px] h-[calc(100vh_-_4.861vw_-_var(--app-69)_-_107px)] min-h-[705px] w-[var(--app-555)] overflow-y-auto rounded-[6px] border border-[#6D7A8A] bg-[#F9F9F9] px-[24px] py-[18px]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)_112px_112px] gap-x-[16px]">
          <div className="h-[var(--app-88)] w-[var(--app-88)] rounded-[16px] bg-[#D9D9D9]" />
          <div className="pt-[14px]">
            <h2 className="text-[20px] font-semibold leading-[1.253] text-[#5B3A29]">
              {programTitle || "프로그램 제목 입력"}
            </h2>
            <p className="mt-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
              프로그램 지역 위치
            </p>
            <p className="mt-[8px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
              호스트명
            </p>
          </div>
          <div className="pt-[22px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            <p>시작일</p>
            <p className="mt-[18px] font-semibold">0000년 00월 00일</p>
          </div>
          <div className="pt-[22px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            <p>종료일</p>
            <p className="mt-[18px] font-semibold">0000년 00월 00일</p>
          </div>
        </div>

        <h3 className="mt-[24px] text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
          프로그램 신청서 폼 제목
        </h3>
        <p className="mt-[22px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          신청서를 작성전 안내사항을 꼭 읽어주세요
        </p>
        <hr className="mt-[22px] border-[#FE701E]" />

        <ApplicationAnswerText
          label="질문내용입니다."
          required
          value={application?.memo}
        />
        <ApplicationAnswerText
          inputMode="numeric"
          label="질문내용입니다."
          value={application?.paymentAmount ? `${application.paymentAmount}` : ""}
        />
        <ApplicationCheckboxPreview />
        <ApplicationSelectPreview />
        <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
          <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
            파일요청 질문 내용 입니다.
          </p>
          <p className="mt-[16px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            &lt;파일요청에 대한 안내 사항 내용입니다.&gt;
          </p>
          <div className="mt-[14px] h-[34px] rounded-[4px] border border-dashed border-[#CAC4BC] bg-white" />
        </div>
      </article>
    </section>
  );
}

function ApplicationAnswerText({
  inputMode = "text",
  label,
  required = false,
  value = "",
}: {
  inputMode?: "numeric" | "text";
  label: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
      <label className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
        {label}
        {required ? <span className="ml-[8px] text-[12px] text-[#FE701E]">*필수항목</span> : null}
        <input
          className="mt-[14px] h-[30px] w-full rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none"
          inputMode={inputMode}
          readOnly
          value={value}
          placeholder={inputMode === "numeric" ? "숫자 입력" : "텍스트 입력"}
        />
      </label>
    </div>
  );
}

function ApplicationCheckboxPreview() {
  return (
    <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
      <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
        질문내용입니다. <span className="font-normal text-[#6D7A8A]">모두 선택해주세요</span>
      </p>
      <div className="mt-[16px] grid grid-cols-2 gap-x-[58px] gap-y-[12px] px-[14px] text-[14px] font-normal leading-[1.253] text-[#5B3A29]">
        {Array.from({ length: 6 }).map((_, index) => (
          <label className="inline-flex items-center gap-[8px]" key={index}>
            <input className="size-[14px]" disabled type="checkbox" />
            선택지 항목1
          </label>
        ))}
      </div>
    </div>
  );
}

function ApplicationSelectPreview() {
  return (
    <div className="mt-[22px] border-t border-dashed border-[#F3D7C4] pt-[18px]">
      <label className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
        질문내용입니다.
        <div className="relative mt-[14px] h-[34px] rounded-[4px] border border-[#FF9A3D] bg-white">
          <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[12px] font-normal leading-[1.253] text-[#CAC4BC]">
            선택해 주세요.
          </span>
          <span className="absolute right-[14px] top-1/2 h-[10px] w-[18px] -translate-y-1/2 rounded-b-full bg-[#FF9A3D]" />
        </div>
      </label>
    </div>
  );
}

function ApplicationSidebar({
  activeItem,
  applicationsHref,
  formsHref,
  messagesHref,
  programId,
  programPath,
  status,
  title,
}: {
  activeItem: "applications";
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  programId: string;
  programPath: string;
  status: string;
  title: string;
}) {
  return (
    <aside className="w-[var(--app-228)] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] max-md:w-full">
      <div className="relative h-[calc(var(--app-438)+var(--app-77))] min-h-[515px]">
        <section className="absolute left-[var(--app-6)] top-0 h-[var(--app-65)] w-[var(--app-216)]">
          <div className="flex h-[33px] w-full items-end px-[var(--app-12)] pb-[1px]">
            <p className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
              {title}
            </p>
            <span className="shrink-0 rounded-[6px] bg-[#FFB45F] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] text-white">
              {status}
            </span>
          </div>
          <div className="flex h-[28px] w-full items-start border-b border-[#D9D9D9] px-[var(--app-12)] pt-[2px]">
            <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
              프로그램 넘버 :{" "}
              <span className="text-[#FE701E]">{formatProgramNumber(programId)}</span>
            </p>
          </div>
        </section>

        <nav className="absolute left-[var(--app-6)] top-[var(--app-77)] h-[var(--app-438)] w-[var(--app-216)] text-[#5B3A29]">
          <section className="absolute left-[var(--app-12)] top-0 h-[var(--app-167)] w-[var(--app-192)]">
            <ApplicationNavLink
              className="absolute left-0 top-0"
              href={`${programPath}?panel=dashboard`}
              label="대시보드"
            />
            <p className="absolute left-0 top-[24px] text-[14px] font-normal leading-[1.253]">
              프로그램 설정
            </p>
            <div className="absolute left-0 top-[48px] h-[119px] w-full border-b-[0.8px] border-[#6D7A8A]">
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-0" href={`${programPath}?panel=basic`} label="기본정보" />
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-[22px]" href={`${programPath}?panel=detail`} label="상세정보" />
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-[44px]" href={`${programPath}?panel=schedule`} label="일정안내" />
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-[66px]" href={`${programPath}?panel=place`} label="장소안내" />
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-[88px]" href={`${programPath}?panel=guide`} label="안내사항" />
            </div>
          </section>

          <section className="absolute left-[var(--app-12)] top-[var(--app-180)] h-[103px] w-[var(--app-192)]">
            <p className="absolute left-0 top-0 text-[14px] font-normal leading-[1.253]">
              신청폼 현황
            </p>
            <div className="absolute left-0 top-[24px] h-[79px] w-full border-b-[0.8px] border-[#6D7A8A]">
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-0" href={formsHref} label="신청폼 연결" />
              <ApplicationSubLink
                active={activeItem === "applications"}
                className="absolute left-[var(--app-6)] top-[26px]"
                href={applicationsHref}
                label="신청 관리"
              />
              <ApplicationSubLink className="absolute left-[var(--app-6)] top-[48px]" href={messagesHref} label="결과 메세지 관리" />
            </div>
          </section>

          <ApplicationNavLink className="absolute left-[var(--app-12)] top-[var(--app-296)]" href={`${programPath}?panel=management`} label="쿠폰 / 프로모션" />
          <ApplicationNavLink className="absolute left-[var(--app-12)] top-[var(--app-327)]" href={messagesHref} label="메세지함" />
          <ApplicationNavLink className="absolute left-[var(--app-12)] top-[var(--app-358)]" href={`${applicationsHref}?panel=receipts`} label="결제 관리" />
          <ApplicationNavLink className="absolute left-[var(--app-12)] top-[var(--app-389)]" href={`${applicationsHref}?panel=reviews`} label="후기 관리" />
          <ApplicationNavLink className="absolute left-[var(--app-12)] top-[var(--app-420)]" href={`${programPath}?panel=delete`} label="프로그램 삭제" />
        </nav>
      </div>
    </aside>
  );
}

function ApplicationNavLink({
  className = "",
  href,
  label,
}: {
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`text-[14px] font-normal leading-[1.253] text-[#5B3A29] ${className}`}
      href={href}
    >
      {label}
    </Link>
  );
}

function ApplicationSubLink({
  active = false,
  className = "",
  href,
  label,
}: {
  active?: boolean;
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`inline-flex h-[19px] w-fit items-center rounded-[4px] px-[5px] text-[12px] leading-[1.253] ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29]"
      } ${className}`}
      href={href}
    >
      {label}
    </Link>
  );
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

function getReviewStatus(status: HostApplicationStatus) {
  if (status === "rejected") {
    return { className: "bg-[#6D7A8A] text-white", label: "거절" };
  }
  if (status === "submitted" || status === "screening") {
    return { className: "bg-[#FFB45F] text-white", label: "검토대기" };
  }
  return { className: "bg-[#7A8B52] text-white", label: "승인" };
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
  if (!value) return "0000. 00. 00";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000. 00. 00";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function formatProgramNumber(programId: string): string {
  const normalizedId = programId.trim();
  if (!normalizedId) return "0000000000";

  return normalizedId.length > 12 ? normalizedId.slice(0, 12) : normalizedId;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "-");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
