"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
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
  buildHostProgramOverviews,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import {
  formatCurrency,
  mergeReportProjects,
  readReportProjects,
  summarizeReportProject,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

export function HostProjectHub({ projectId }: { projectId: string }) {
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
  const programs = useMemo(
    () => (project ? buildHostProgramOverviews(project, applications) : []),
    [applications, project],
  );
  const reportSummary = project?.reportProject
    ? summarizeReportProject(project.reportProject, applications)
    : undefined;

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
            프로젝트 목록에서 다시 선택하거나 새 운영 프로젝트를 만들어 주세요.
          </p>
        </div>
      </div>
    );
  }

  const projectPath = hostProjectPath(project.id);

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
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          href={`${projectPath}/programs/new`}
        >
          <Plus size={16} />새 프로그램
        </Link>
      </div>

      <section className="rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <FolderKanban size={18} />
          Operation Project
        </p>
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <h1 className="max-w-4xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {project.villageName} · {project.periodLabel} · {project.statusLabel}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              이 프로젝트 안에서 공개 모집 프로그램을 만들고, 프로그램별 신청자,
              신청서, 안내 메시지를 관리합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <HeroMetric label="프로그램" value={`${programs.length}개`} />
            <HeroMetric label="신청자" value={`${project.applicationCount}명`} />
            <HeroMetric label="증빙 누락" value={`${project.missingEvidenceCount}개`} />
            <HeroMetric label="마감 준비율" value={`${project.readiness}%`} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
              <ClipboardList size={18} />
              이 프로젝트의 프로그램
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              먼저 프로그램을 선택하세요
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              신청자 CRM, 신청서, 메시지는 프로젝트 전체가 아니라 각 프로그램의
              모집 흐름 안에서 이어집니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href={`${projectPath}/programs/new`}
          >
            <Plus size={16} />
            프로그램 신설
          </Link>
        </div>
      </section>

      {programs.length > 0 ? (
        <section className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              projectId={project.id}
              villageName={project.villageName}
            />
          ))}
        </section>
      ) : (
        <section className="mt-5 rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
          <ClipboardList className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            아직 연결된 프로그램이 없습니다.
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-500">
            프로그램을 신설하면 이 프로젝트의 하위 모집 단위로 표시됩니다.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href={`${projectPath}/programs/new`}
          >
            <Plus size={16} />
            프로그램 신설
          </Link>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ProjectToolCard
          description="예산, 지출, 증빙 파일은 프로젝트 상위 단위에서 모아 마감 자료로 정리합니다."
          href={`${projectPath}/evidence`}
          icon={<WalletCards size={20} />}
          metrics={[
            ["집행 금액", formatCurrency(reportSummary?.usedAmount ?? project.usedAmount)],
            ["예산", project.totalBudget ? formatCurrency(project.totalBudget) : "-"],
          ]}
          title="프로젝트 지출/증빙"
        />
        <ProjectToolCard
          description="프로그램별 모집 결과와 활동 기록을 프로젝트 마감/보고 자료로 묶습니다."
          href={`${projectPath}/closeout`}
          icon={<FileText size={20} />}
          metrics={[
            ["준비율", `${reportSummary?.readiness ?? project.readiness}%`],
            ["활동", `${reportSummary?.activityCount ?? project.activityCount}건`],
          ]}
          title="프로젝트 마감/보고"
        />
      </section>
    </div>
  );
}

function ProgramCard({
  program,
  projectId,
  villageName,
}: {
  program: HostProgramOverview;
  projectId: string;
  villageName: string;
}) {
  const programPath = hostProgramPath(projectId, program.id);

  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${program.title} 운영 화면 열기`}
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-slate-300"
        href={programPath}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          src={program.imageUrl}
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-white">
          <p className="line-clamp-1 text-sm font-black">{villageName}</p>
          <p className="mt-1 text-xs font-bold text-white/75">
            모집/검토 · 준비율 {program.readiness}%
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <Link className="min-w-0" href={programPath}>
            <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
              {program.title}
            </h3>
          </Link>
          <span className="shrink-0 pt-0.5 text-base font-black text-slate-950">
            {program.pendingCount > 0 ? `검토 ${program.pendingCount}` : `${program.readiness}%`}
          </span>
        </div>

        <p className="mt-1 text-sm font-bold text-slate-500">
          프로그램 단위 운영
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          <ProgramSignal label="신청" value={`${program.applicationCount}명`} />
          <ProgramSignal label="증빙" value={`${program.missingEvidenceCount}개`} />
          <ProgramSignal label="참여" value={`${program.activeCount}명`} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SubFeatureLink href={`${programPath}/applications`} label="신청자" />
          <SubFeatureLink href={`${programPath}/forms`} label="신청서" />
          <SubFeatureLink href={`${programPath}/messages`} label="메시지" />
          <SubFeatureLink href={programPath} label="운영" />
        </div>
      </div>
    </article>
  );
}

function ProjectToolCard({
  description,
  href,
  icon,
  metrics,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  metrics: Array<[string, string]>;
  title: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <span className="text-[var(--primary)]">{icon}</span>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <div className="rounded-md bg-slate-50 p-3" key={label}>
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </div>
      <Link
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
        href={href}
      >
        열기
        <ArrowRight size={15} />
      </Link>
    </section>
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

function ProgramSignal({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-slate-600">
      {label} {value}
    </span>
  );
}

function SubFeatureLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-xs font-black text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      href={href}
    >
      {label}
    </Link>
  );
}
