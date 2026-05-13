"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  Plus,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  mergeHostApplications,
  readHostApplicationsFromStorage,
  seedHostApplications,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
import {
  findHostProjectOverview,
  hostProjectPath,
  type HostProjectOverview,
} from "@/lib/host-projects";
import {
  buildReportChecklist,
  evidenceStatusLabels,
  formatCurrency,
  mergeReportProjects,
  paymentMethodLabels,
  readReportProjects,
  summarizeReportProject,
  writeReportProjects,
} from "@/lib/report-automation";
import type { EvidenceItemStatus, ReportProject } from "@/lib/report-automation";

export type HostProjectWorkspaceSection = "activities" | "evidence" | "closeout";

const evidenceTone: Record<EvidenceItemStatus, string> = {
  approved: "bg-teal-50 text-teal-700 ring-teal-100",
  missing: "bg-rose-50 text-rose-700 ring-rose-100",
  submitted: "bg-blue-50 text-blue-700 ring-blue-100",
};

export function HostProjectWorkspace({
  projectId,
  section,
}: {
  projectId: string;
  section: HostProjectWorkspaceSection;
}) {
  const [applications, setApplications] = useState<HostApplication[]>(
    seedHostApplications,
  );
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);

  useEffect(() => {
    let cancelled = false;
    const storageTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setApplications(readHostApplicationsFromStorage());
      setReportProjects(readReportProjects());
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
  const projectPath = hostProjectPath(projectId);

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
            프로젝트 목록에서 다시 선택해 주세요.
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
          href={projectPath}
        >
          <ArrowLeft size={16} />
          프로젝트 허브
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          프로젝트 목록
        </Link>
      </div>


      <ProjectTabs projectPath={projectPath} section={section} />

      <div className="mt-6">
        {section === "activities" ? <ActivitiesView project={project} /> : null}
        {section === "evidence" ? <EvidenceView project={project} /> : null}
        {section === "closeout" ? (
          <CloseoutView applications={applications} project={project} />
        ) : null}
      </div>
    </div>
  );
}

function ProjectTabs({
  projectPath,
  section,
}: {
  projectPath: string;
  section: HostProjectWorkspaceSection;
}) {
  const items = [
    { href: projectPath, label: "프로그램 선택", icon: FolderKanban },
    { href: `${projectPath}/programs/new`, label: "새 프로그램", icon: Plus },
    { href: `${projectPath}/activities`, label: "활동/참석", icon: ClipboardList, id: "activities" },
    { href: `${projectPath}/evidence`, label: "지출/증빙", icon: WalletCards, id: "evidence" },
    { href: `${projectPath}/closeout`, label: "마감/보고", icon: FileText, id: "closeout" },
  ];

  return (
    <nav className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === section;

        return (
          <Link
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
              active
                ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                : "border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActivitiesView({ project }: { project: HostProjectOverview }) {
  const activities = project.reportProject?.activityEvents ?? [];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <SectionHeading icon={<ClipboardList size={20} />} title="활동/참석" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SmallMetric label="활동 기록" value={`${project.activityCount}건`} />
        <SmallMetric label="참여자" value={`${project.activeCount}명`} />
        <SmallMetric
          label="연결 프로그램"
          value={`${project.connectedProgramTitles.length}개`}
        />
      </div>
      <div className="mt-5 grid gap-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <article
              className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4"
              key={activity.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-black text-slate-950">{activity.title}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {formatDate(activity.activityAt)} · {activity.place}
                  </p>
                </div>
                <p className="rounded-md bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                  {activity.participantCount}명 · 사진 {activity.photosCount}장
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {activity.description}
              </p>
            </article>
          ))
        ) : (
          <EmptyState>
            아직 이 프로젝트에 연결된 활동 기록이 없습니다. 운영 프로젝트 설정에서
            활동 이벤트를 추가하면 마감 자료로 재사용됩니다.
          </EmptyState>
        )}
      </div>
    </section>
  );
}

function EvidenceView({ project }: { project: HostProjectOverview }) {
  const expenses = project.reportProject?.expenseEvents ?? [];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <SectionHeading icon={<WalletCards size={20} />} title="지출/증빙" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SmallMetric label="집행 금액" value={formatCurrency(project.usedAmount)} />
        <SmallMetric
          label="예산"
          value={project.totalBudget ? formatCurrency(project.totalBudget) : "-"}
        />
        <SmallMetric label="누락 증빙" value={`${project.missingEvidenceCount}개`} />
      </div>
      <div className="mt-5 grid gap-3">
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <article
              className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4"
              key={expense.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-black text-slate-950">{expense.title}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {formatDate(expense.spentAt)} · {expense.vendor} ·{" "}
                    {paymentMethodLabels[expense.paymentMethod]}
                  </p>
                </div>
                <p className="font-mono text-lg font-black text-slate-950">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {expense.evidenceItems.map((item) => (
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${
                      evidenceTone[item.status]
                    }`}
                    key={`${expense.id}-${item.ruleId}`}
                  >
                    {item.label} · {evidenceStatusLabels[item.status]}
                  </span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <EmptyState>
            아직 이 프로젝트에 연결된 지출 이벤트가 없습니다. 지출을 등록하면
            필요한 증빙 체크리스트가 프로젝트 기준으로 쌓입니다.
          </EmptyState>
        )}
      </div>
      <Link
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
        href="/host/reports"
      >
        운영 프로젝트 설정
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}

function CloseoutView({
  applications,
  project,
}: {
  applications: HostApplication[];
  project: HostProjectOverview;
}) {
  const summary = project.reportProject
    ? summarizeReportProject(project.reportProject, applications)
    : undefined;
  const checklist = project.reportProject
    ? buildReportChecklist(project.reportProject, applications)
    : [];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <SectionHeading icon={<FileText size={20} />} title="마감/보고" />
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <SmallMetric label="준비율" value={`${summary?.readiness ?? project.readiness}%`} />
        <SmallMetric label="신청자" value={`${project.applicationCount}명`} />
        <SmallMetric label="활동" value={`${summary?.activityCount ?? project.activityCount}건`} />
        <SmallMetric label="누락 증빙" value={`${project.missingEvidenceCount}개`} />
      </div>
      <div className="mt-5 grid gap-3">
        {checklist.length > 0 ? (
          checklist.map((item) => (
            <article
              className="flex items-start gap-3 rounded-md bg-[var(--surface-muted)] p-4"
              key={item.id}
            >
              <CheckCircle2
                className={item.done ? "text-[var(--primary)]" : "text-amber-600"}
                size={20}
              />
              <div>
                <p className="font-black text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.helper}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState>
            이 프로그램 프로젝트는 아직 운영 마감 프로젝트와 연결되지 않았습니다.
            운영 프로젝트로 연결하면 마감 체크리스트가 생성됩니다.
          </EmptyState>
        )}
      </div>
    </section>
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-[var(--surface-muted)] p-4 text-sm font-bold leading-6 text-slate-500">
      {children}
    </p>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
