"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  formatCurrency,
  reportStatusLabels,
  summarizeReportProject,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

export function AdminReportReview() {
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const response = await fetch("/api/host/reports", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: ReportProject[] };
        const databaseProjects = Array.isArray(payload.data) ? payload.data : [];
        if (isMounted) {
          setProjects(databaseProjects);
        }
      } catch {
        if (isMounted) setLoadError("DB 운영 폴더를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      projects.map((project) => ({
        project,
        summary: summarizeReportProject(project),
      })),
    [projects],
  );
  const readyCount = rows.filter((row) => row.summary.readiness >= 80).length;
  const missingEvidenceCount = rows.reduce(
    (sum, row) => sum + row.summary.missingEvidenceCount,
    0,
  );
  const overBudgetCount = rows.filter(
    (row) => row.summary.overBudgetAmount > 0,
  ).length;
  const averageReadiness =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, row) => sum + row.summary.readiness, 0) / rows.length,
        )
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <ShieldCheck size={18} />
          Layer 3 Operations Review
        </p>
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h1 className="max-w-4xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              로컬페이지별 운영 폴더의 마감 준비와 증빙 리스크를 검토합니다.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              관리자는 템플릿을 강제하기보다 각 로컬페이지가 직접 구성한 예산,
              지출, 증빙, 활동 필드를 기준으로 누락과 위험 신호를 확인합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Metric label="평균 준비율" value={`${averageReadiness}%`} />
            <Metric label="마감권 폴더" value={`${readyCount}/${rows.length}`} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <RiskCard
          helper="필수 증빙 미수집 항목"
          icon={<FileWarning size={20} />}
          label="증빙 누락"
          tone={missingEvidenceCount > 0 ? "warning" : "ok"}
          value={`${missingEvidenceCount}개`}
        />
        <RiskCard
          helper="계획 예산을 넘긴 폴더"
          icon={<AlertTriangle size={20} />}
          label="예산 리스크"
          tone={overBudgetCount > 0 ? "danger" : "ok"}
          value={`${overBudgetCount}건`}
        />
        <RiskCard
          helper="호스트가 직접 채워야 하는 필드"
          icon={<ClipboardCheck size={20} />}
          label="수동 입력"
          tone="neutral"
          value={`${rows.reduce((sum, row) => sum + row.summary.manualMissingCount, 0)}개`}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              운영 폴더 검토
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              준비율, 증빙 누락, 예산 초과, 활동 기록을 한 줄로 확인합니다.
            </p>
          </div>
          {loading ? <Loader2 className="animate-spin text-slate-400" size={20} /> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">로컬페이지 / 폴더</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">준비율</th>
                <th className="px-5 py-3">증빙</th>
                <th className="px-5 py-3">예산</th>
                <th className="px-5 py-3">활동</th>
                <th className="px-5 py-3">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ project, summary }) => (
                <tr key={project.id}>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">{project.villageName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {project.title}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                      {reportStatusLabels[project.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-[var(--primary)]"
                        style={{ width: `${summary.readiness}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-black text-slate-700">
                      {summary.readiness}%
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-600">
                    {summary.completedEvidenceCount}/{summary.requiredEvidenceCount} 수집
                    <br />
                    누락 {summary.missingEvidenceCount}개
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-600">
                    {formatCurrency(summary.usedAmount)}
                    <br />
                    초과 {formatCurrency(summary.overBudgetAmount)}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-600">
                    {summary.activityCount}건
                    <br />
                    {summary.participantCount}명
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      href="/host/reports"
                    >
                      열기
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            아직 검토할 운영 폴더가 없습니다.
          </div>
        ) : null}
      </section>

      {loadError ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-950 p-4 text-white">
      <p className="text-xs font-black text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function RiskCard({
  helper,
  icon,
  label,
  tone,
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  tone: "danger" | "neutral" | "ok" | "warning";
  value: string;
}) {
  const toneClass = {
    danger: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-700",
    ok: "bg-teal-50 text-teal-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-md ${toneClass}`}>
          {tone === "ok" ? <CheckCircle2 size={20} /> : icon}
        </span>
      </div>
    </div>
  );
}
