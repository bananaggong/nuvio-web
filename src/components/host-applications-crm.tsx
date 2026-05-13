"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  applicationStatusFlow,
  mergeHostApplications,
  readHostApplicationsFromStorage,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type {
  HostApplication,
  HostApplicationStatus,
} from "@/lib/host-operations";
import {
  findHostProgramOverview,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
} from "@/lib/host-projects";
import {
  mergeReportProjects,
  readReportProjects,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

const allStatuses: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

const statusLabels: Record<HostApplicationStatus, string> = {
  submitted: "접수",
  screening: "검토",
  accepted: "선정",
  rejected: "반려",
  checkedIn: "참여중",
  completed: "완료",
};

const statusTone: Record<HostApplicationStatus, string> = {
  submitted: "bg-blue-50 text-blue-700 ring-blue-100",
  screening: "bg-amber-50 text-amber-700 ring-amber-100",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-rose-50 text-rose-700 ring-rose-100",
  checkedIn: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
};

type StatusFilter = HostApplicationStatus | "all";

export function HostApplicationsCrm({
  programId,
  projectId,
}: {
  programId?: string;
  projectId?: string;
}) {
  const [applications, setApplications] = useState<HostApplication[]>(
    readHostApplicationsFromStorage,
  );
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
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
        // Keep local fallback applications available while the DB is unavailable.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  const project = useMemo(() => {
    if (!projectId) return undefined;
    return findHostProjectOverview(projectId, applications, reportProjects);
  }, [applications, projectId, reportProjects]);
  const program = useMemo(() => {
    if (!projectId || !programId) return undefined;
    return findHostProgramOverview(
      projectId,
      programId,
      applications,
      reportProjects,
    );
  }, [applications, programId, projectId, reportProjects]);
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && program ? hostProgramPath(projectId, program.id) : undefined;
  const scopedApplications = program
    ? program.applications
    : project
      ? project.applications
      : applications;

  const programOptions = useMemo(() => {
    return Array.from(
      new Set(scopedApplications.map((item) => item.programTitle)),
    );
  }, [scopedApplications]);

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return scopedApplications.filter((application) => {
      const matchesSearch =
        !query ||
        application.applicantName.toLowerCase().includes(query) ||
        application.email.toLowerCase().includes(query) ||
        application.phone.includes(query) ||
        application.programTitle.toLowerCase().includes(query) ||
        application.memo.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;
      const matchesProgram =
        programFilter === "all" || application.programTitle === programFilter;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [programFilter, scopedApplications, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    const activeCount = scopedApplications.filter((item) =>
      ["accepted", "checkedIn", "completed"].includes(item.status),
    ).length;
    const pendingCount = scopedApplications.filter((item) =>
      ["submitted", "screening"].includes(item.status),
    ).length;

    return [
      {
        label: "전체 신청",
        value: `${scopedApplications.length}명`,
        helper: "접수된 신청서",
        icon: ClipboardList,
      },
      {
        label: "검토 대기",
        value: `${pendingCount}명`,
        helper: "접수 또는 검토 상태",
        icon: Clock3,
      },
      {
        label: "선정 이후",
        value: `${activeCount}명`,
        helper: "선정, 참여중, 완료",
        icon: CheckCircle2,
      },
      {
        label: "프로그램",
        value: `${programOptions.length}개`,
        helper: "신청이 발생한 프로그램",
        icon: Users,
      },
    ];
  }, [programOptions.length, scopedApplications]);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {projectBasePath ? (
        <Link
          className="mb-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={programBasePath ?? projectBasePath}
        >
          {programBasePath ? "프로그램 허브" : "프로젝트 허브"}
          <ArrowRight size={16} />
        </Link>
      ) : null}

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              className="rounded-md border border-slate-200 bg-white p-4"
              key={metric.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {metric.helper}
                  </p>
                </div>
                <Icon className="text-[var(--primary)]" size={22} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              className="h-11 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[var(--primary)]"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="이름, 이메일, 연락처, 프로그램으로 검색"
              value={searchTerm}
            />
          </label>
          <label className="relative block">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <select
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--primary)]"
              onChange={(event) => setProgramFilter(event.target.value)}
              value={programFilter}
            >
              <option value="all">전체 프로그램</option>
              {programOptions.map((programTitle) => (
                <option key={programTitle} value={programTitle}>
                  {programTitle}
                </option>
              ))}
            </select>
          </label>
          <select
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--primary)]"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">전체 상태</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">신청자 목록</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {isLoading
              ? "신청서를 불러오는 중입니다."
              : `${filteredApplications.length}명의 신청자가 표시됩니다.`}
          </p>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="p-10 text-center">
            <UserRound className="mx-auto text-slate-300" size={42} />
            <h3 className="mt-4 text-lg font-black text-slate-950">
              표시할 신청자가 없습니다
            </h3>
            <p className="mt-2 text-sm font-bold text-slate-500">
              검색어나 필터를 바꾸면 다른 신청서를 볼 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
                  <th className="px-5 py-3">신청자</th>
                  <th className="px-5 py-3">프로그램</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">메모</th>
                  <th className="px-5 py-3">접수일</th>
                  <th className="px-5 py-3 text-right">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr
                    className="border-b border-slate-100 align-top last:border-0"
                    key={application.id}
                  >
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">
                        {application.applicantName}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {application.email}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {application.phone || "연락처 없음"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {application.programTitle}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
                        onChange={(event) =>
                          updateApplicationStatus(
                            application.id,
                            event.target.value as HostApplicationStatus,
                          )
                        }
                        value={application.status}
                      >
                        {allStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <span
                        className={`ml-2 inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${
                          statusTone[application.status]
                        }`}
                      >
                        {statusLabels[application.status]}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-5 py-4 text-xs leading-5 text-slate-500">
                      {application.memo || "메모 없음"}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-500">
                      {formatDateTime(application.submittedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        href={
                          programBasePath
                            ? `${programBasePath}/applications/${encodeURIComponent(application.id)}`
                            : projectBasePath
                            ? `${projectBasePath}/applications/${encodeURIComponent(application.id)}`
                            : `/host/applications/${application.id}`
                        }
                      >
                        상세보기
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
