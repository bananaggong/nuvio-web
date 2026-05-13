"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FilePlus2,
  FileText,
  FolderKanban,
  MessageSquareText,
  Send,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  applicationStatusFlow,
  applicationStatusLabels,
  mergeHostApplications,
  readHostApplicationsFromStorage,
  seedHostApplications,
  seedMessageTemplates,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type {
  HostApplication,
  HostApplicationStatus,
  MessageTemplate,
} from "@/lib/host-operations";
import {
  findHostProjectOverview,
  type HostProjectOverview,
} from "@/lib/host-projects";
import {
  buildReportChecklist,
  formatCurrency,
  mergeReportProjects,
  readReportProjects,
  summarizeReportProject,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

const TEMPLATE_STORAGE_KEY = "nuvio:message-templates";
const applicationStatusOptions: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

export function HostProjectHub({ projectId }: { projectId: string }) {
  const [applications, setApplications] = useState<HostApplication[]>(
    seedHostApplications,
  );
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(seedMessageTemplates);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const storageTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setApplications(readHostApplicationsFromStorage());
      setReportProjects(readReportProjects());
      setTemplates(readStoredTemplates());
    }, 0);

    async function loadRemoteState() {
      try {
        const [applicationsResponse, reportsResponse] = await Promise.all([
          fetch("/api/host/applications", { cache: "no-store" }),
          fetch("/api/host/reports", { cache: "no-store" }),
        ]);

        if (applicationsResponse.ok) {
          const payload = (await applicationsResponse.json()) as {
            data?: HostApplication[];
          };
          if (payload.data && !cancelled) {
            setApplications((current) => {
              const next = mergeHostApplications(current, payload.data ?? []);
              writeHostApplicationsToStorage(next);
              return next;
            });
          }
        }

        if (reportsResponse.ok) {
          const payload = (await reportsResponse.json()) as {
            data?: ReportProject[];
          };
          if (payload.data && !cancelled) {
            setReportProjects((current) => {
              const next = mergeReportProjects(payload.data ?? [], current);
              writeReportProjects(next);
              return next;
            });
          }
        }
      } catch {
        // Keep local fallback data visible.
      }
    }

    void loadRemoteState();

    return () => {
      cancelled = true;
      window.clearTimeout(storageTimeoutId);
    };
  }, []);

  const project = useMemo(
    () => findHostProjectOverview(projectId, applications, reportProjects),
    [applications, projectId, reportProjects],
  );
  const reportSummary = project?.reportProject
    ? summarizeReportProject(project.reportProject, applications)
    : undefined;
  const reportChecklist = project?.reportProject
    ? buildReportChecklist(project.reportProject, applications)
    : [];

  function updateApplicationStatus(
    applicationId: string,
    status: HostApplicationStatus,
  ) {
    const next = applications.map((application) =>
      application.id === applicationId ? { ...application, status } : application,
    );
    setApplications(next);
    writeHostApplicationsToStorage(next);
    void persistApplicationStatus(applicationId, status);
  }

  function toggleApplicationFlag(
    applicationId: string,
    key: "signatureCompleted" | "reviewSubmitted",
  ) {
    const next = applications.map((application) =>
      application.id === applicationId
        ? { ...application, [key]: !application[key] }
        : application,
    );
    setApplications(next);
    writeHostApplicationsToStorage(next);
  }

  async function copyTemplate(template: MessageTemplate) {
    await navigator.clipboard.writeText(template.body);
    setCopiedTemplateId(template.id);
    window.setTimeout(() => setCopiedTemplateId(undefined), 1600);
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          프로젝트 목록
        </Link>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black text-slate-950">
            프로젝트를 찾을 수 없습니다.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            프로젝트 목록에서 다시 선택하거나 운영 프로젝트를 새로 설정해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          프로젝트 목록
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host/reports"
        >
          운영 프로젝트 설정
          <ArrowRight size={16} />
        </Link>
      </div>

      <section className="rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <FolderKanban size={18} />
          Project Operations
        </p>
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <h1 className="max-w-4xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {project.villageName} · {project.periodLabel} · {project.statusLabel}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <HeroMetric label="신청자" value={`${project.applicationCount}명`} />
            <HeroMetric label="검토 대기" value={`${project.pendingCount}명`} />
            <HeroMetric label="증빙 누락" value={`${project.missingEvidenceCount}개`} />
            <HeroMetric label="마감 준비율" value={`${project.readiness}%`} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <FeatureJump href="#applications" icon={<Users size={17} />} label="신청자" />
        <FeatureJump href="#forms" icon={<FilePlus2 size={17} />} label="신청서" />
        <FeatureJump href="#messages" icon={<MessageSquareText size={17} />} label="메시지" />
        <FeatureJump href="#activities" icon={<ClipboardList size={17} />} label="활동/참석" />
        <FeatureJump href="#evidence" icon={<WalletCards size={17} />} label="지출/증빙" />
        <FeatureJump href="#closeout" icon={<FileText size={17} />} label="마감/보고" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <ApplicationsSection
            applications={project.applications}
            onStatusChange={updateApplicationStatus}
            onToggleFlag={toggleApplicationFlag}
          />
          <FormsSection project={project} />
          <MessagesSection
            copiedTemplateId={copiedTemplateId}
            onCopyTemplate={copyTemplate}
            templates={templates}
          />
        </div>

        <aside className="grid gap-6">
          <CloseoutSection
            checklist={reportChecklist}
            project={project}
            reportReadiness={reportSummary?.readiness}
          />
          <EvidenceSection project={project} />
          <ActivitiesSection project={project} />
        </aside>
      </section>
    </div>
  );
}

function ApplicationsSection({
  applications,
  onStatusChange,
  onToggleFlag,
}: {
  applications: HostApplication[];
  onStatusChange: (applicationId: string, status: HostApplicationStatus) => void;
  onToggleFlag: (
    applicationId: string,
    key: "signatureCompleted" | "reviewSubmitted",
  ) => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
      id="applications"
    >
      <SectionHeader
        actionHref="/host/applications"
        actionLabel="전체 CRM"
        icon={<Users size={20} />}
        title="이 프로젝트의 신청자"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
              <th className="px-5 py-3">신청자</th>
              <th className="px-5 py-3">상태</th>
              <th className="px-5 py-3">참여 자료</th>
              <th className="px-5 py-3">운영 메모</th>
              <th className="px-5 py-3 text-right">상세</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr
                className="border-b border-slate-100 align-top last:border-0"
                key={application.id}
              >
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">
                    {application.applicantName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {application.phone || application.email}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
                    onChange={(event) =>
                      onStatusChange(
                        application.id,
                        event.target.value as HostApplicationStatus,
                      )
                    }
                    value={application.status}
                  >
                    {applicationStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {applicationStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <FlagButton
                      active={application.signatureCompleted}
                      label="서명"
                      onClick={() =>
                        onToggleFlag(application.id, "signatureCompleted")
                      }
                    />
                    <FlagButton
                      active={application.reviewSubmitted}
                      label="리뷰"
                      onClick={() =>
                        onToggleFlag(application.id, "reviewSubmitted")
                      }
                    />
                  </div>
                </td>
                <td className="max-w-[280px] px-5 py-4 text-xs leading-5 text-slate-500">
                  {application.memo || "메모 없음"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    href={`/host/applications/${application.id}`}
                  >
                    상세
                    <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {applications.length === 0 ? (
        <p className="p-5 text-sm font-bold text-slate-500">
          아직 이 프로젝트에 연결된 신청자가 없습니다.
        </p>
      ) : null}
    </section>
  );
}

function FormsSection({ project }: { project: HostProjectOverview }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5" id="forms">
      <SectionHeading icon={<FilePlus2 size={20} />} title="신청서" />
      <p className="mt-2 text-sm leading-6 text-slate-500">
        신청서 필드는 전역 도구가 아니라 이 프로젝트 모집 흐름에 연결되는
        질문 세트로 다룹니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.connectedProgramTitles.map((title) => (
          <span
            className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-black text-slate-600"
            key={title}
          >
            {title}
          </span>
        ))}
      </div>
      <Link
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
        href={`/host/forms?project=${encodeURIComponent(project.id)}`}
      >
        신청서 설정 열기
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}

function MessagesSection({
  copiedTemplateId,
  onCopyTemplate,
  templates,
}: {
  copiedTemplateId?: string;
  onCopyTemplate: (template: MessageTemplate) => Promise<void>;
  templates: MessageTemplate[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5" id="messages">
      <SectionHeading icon={<MessageSquareText size={20} />} title="메시지" />
      <p className="mt-2 text-sm leading-6 text-slate-500">
        합격, 참여 전, 종료 이후 안내를 이 프로젝트 신청자에게 보낼 수 있는
        템플릿입니다.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {templates.slice(0, 3).map((template) => (
          <article className="rounded-md bg-slate-50 p-3" key={template.id}>
            <p className="text-xs font-black text-[var(--primary)]">
              {template.trigger}
            </p>
            <p className="mt-1 font-black text-slate-950">{template.name}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {template.body}
            </p>
            <button
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:text-[var(--primary)]"
              onClick={() => void onCopyTemplate(template)}
              type="button"
            >
              {copiedTemplateId === template.id ? <Check size={15} /> : <Send size={15} />}
              {copiedTemplateId === template.id ? "복사됨" : "복사"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CloseoutSection({
  checklist,
  project,
  reportReadiness,
}: {
  checklist: ReturnType<typeof buildReportChecklist>;
  project: HostProjectOverview;
  reportReadiness?: number;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5" id="closeout">
      <SectionHeading icon={<FileText size={20} />} title="마감/보고" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <SmallMetric label="준비율" value={`${reportReadiness ?? project.readiness}%`} />
        <SmallMetric label="누락 증빙" value={`${project.missingEvidenceCount}개`} />
      </div>
      <div className="mt-4 grid gap-2">
        {checklist.length > 0 ? (
          checklist.slice(0, 5).map((item) => (
            <p
              className="flex items-start gap-2 rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600"
              key={item.id}
            >
              <span className={item.done ? "text-[var(--primary)]" : "text-amber-700"}>
                {item.done ? "완료" : "필요"}
              </span>
              <span>{item.label}</span>
            </p>
          ))
        ) : (
          <p className="rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-500">
            이 프로그램 프로젝트는 아직 운영 마감 프로젝트와 연결되지 않았습니다.
          </p>
        )}
      </div>
      <Link
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
        href="/host/reports"
      >
        지출/증빙 설정
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}

function EvidenceSection({ project }: { project: HostProjectOverview }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5" id="evidence">
      <SectionHeading icon={<WalletCards size={20} />} title="지출/증빙" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <SmallMetric label="집행 금액" value={formatCurrency(project.usedAmount)} />
        <SmallMetric label="예산" value={project.totalBudget ? formatCurrency(project.totalBudget) : "-"} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        증빙 파일, 지출 이벤트, 예산 항목은 운영 마감 화면에서 이 프로젝트와
        연결해 관리합니다.
      </p>
    </section>
  );
}

function ActivitiesSection({ project }: { project: HostProjectOverview }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5" id="activities">
      <SectionHeading icon={<ClipboardList size={20} />} title="활동/참석" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <SmallMetric label="활동 기록" value={`${project.activityCount}건`} />
        <SmallMetric label="참여자" value={`${project.activeCount}명`} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        활동 내용, 참석자 수, 사진 수는 마감 자료와 공개 후기 콘텐츠로 재사용할
        수 있습니다.
      </p>
    </section>
  );
}

function SectionHeader({
  actionHref,
  actionLabel,
  icon,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <SectionHeading icon={icon} title={title} />
      <Link
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
        href={actionHref}
      >
        {actionLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
      <span className="text-[var(--primary)]">{icon}</span>
      {title}
    </h2>
  );
}

function FeatureJump({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      href={href}
    >
      {icon}
      {label}
    </a>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-black text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function FlagButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-black ${
        active
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label} {active ? "완료" : "대기"}
    </button>
  );
}

function readStoredTemplates(): MessageTemplate[] {
  if (typeof window === "undefined") return seedMessageTemplates;

  try {
    const rawValue = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!rawValue) return seedMessageTemplates;
    return JSON.parse(rawValue) as MessageTemplate[];
  } catch {
    return seedMessageTemplates;
  }
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
