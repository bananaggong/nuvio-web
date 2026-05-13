"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  MessageSquareText,
  Plus,
  Settings,
  Users,
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
  type HostProjectOverview,
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
            프로젝트 목록에서 다시 선택하거나 새 프로젝트를 만들어 주세요.
          </p>
        </div>
      </div>
    );
  }

  const projectPath = hostProjectPath(project.id);
  const featureTiles = buildFeatureTiles(project, projectPath, programs.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          모든 프로젝트
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            href="/host/reports"
          >
            <Settings size={16} />
            프로젝트 설정
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href={`${projectPath}/programs/new`}
          >
            <Plus size={16} />
            새 프로그램
          </Link>
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-[var(--primary)] text-xl font-black text-white">
              {project.title.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                <FolderKanban size={18} />
                프로젝트 작업공간
              </p>
              <h1 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                {project.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                프로젝트는 폴더처럼 프로그램을 담는 상위 공간입니다. 신청자,
                신청서, 안내 메시지는 프로그램 안에서 관리하고, 지출/증빙과
                마감은 프로젝트 기준으로 모읍니다.
              </p>
            </div>
          </div>
          <div className="grid min-w-[280px] gap-2 sm:grid-cols-2 lg:w-[360px]">
            <HeaderMetric label="프로그램" value={`${programs.length}개`} />
            <HeaderMetric label="신청자" value={`${project.applicationCount}명`} />
            <HeaderMetric label="증빙 누락" value={`${project.missingEvidenceCount}개`} />
            <HeaderMetric label="준비율" value={`${project.readiness}%`} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-3">
            <p className="px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Project Menu
            </p>
            <div className="mt-3 grid gap-1">
              {featureTiles.map((tile) => (
                <Link
                  className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-2 text-sm font-black text-slate-700 hover:bg-teal-50 hover:text-[var(--primary)]"
                  href={tile.href}
                  key={tile.title}
                >
                  <span className="grid size-8 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                    {tile.icon}
                  </span>
                  <span className="min-w-0 truncate">{tile.title}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ListChecks className="text-[var(--primary)]" size={17} />
              프로젝트 상태
            </h2>
            <div className="mt-3 grid gap-2">
              <StatusLine label="상태" value={project.statusLabel} />
              <StatusLine label="기간" value={project.periodLabel} />
              <StatusLine
                label="집행"
                value={formatCurrency(reportSummary?.usedAmount ?? project.usedAmount)}
              />
              <StatusLine
                label="활동"
                value={`${reportSummary?.activityCount ?? project.activityCount}건`}
              />
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                  <LayoutGrid size={18} />
                  기능 보드
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  이 프로젝트에서 할 일
                </h2>
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                href={`${projectPath}/programs/new`}
              >
                <Plus size={16} />
                프로그램 신설
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featureTiles.map((tile) => (
                <FeatureTile key={tile.title} tile={tile} />
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-md border border-slate-200 bg-white p-5" id="programs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                  <ClipboardList size={18} />
                  프로그램
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  프로젝트 안의 프로그램
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  프로그램을 선택하면 그 안에서 신청자 CRM, 신청서, 안내 메시지를
                  이어서 관리합니다.
                </p>
              </div>
            </div>

            {programs.length > 0 ? (
              <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    projectId={project.id}
                    villageName={project.villageName}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-[var(--surface-muted)] p-8 text-center">
                <ClipboardList className="mx-auto text-slate-300" size={42} />
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  아직 프로그램이 없습니다.
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  프로그램을 신설하면 이 프로젝트 안에 파일처럼 쌓입니다.
                </p>
                <Link
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                  href={`${projectPath}/programs/new`}
                >
                  <Plus size={16} />
                  프로그램 신설
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

type FeatureTileModel = {
  description: string;
  href: string;
  icon: ReactNode;
  metric: string;
  title: string;
};

function buildFeatureTiles(
  project: HostProjectOverview,
  projectPath: string,
  programCount: number,
): FeatureTileModel[] {
  return [
    {
      description: "프로젝트 안에 공개 모집 프로그램을 만들고 선택합니다.",
      href: "#programs",
      icon: <ClipboardList size={18} />,
      metric: `${programCount}개`,
      title: "프로그램",
    },
    {
      description: "프로그램을 선택한 뒤 해당 프로그램 신청자만 검토합니다.",
      href: "#programs",
      icon: <Users size={18} />,
      metric: `${project.applicationCount}명`,
      title: "신청자 CRM",
    },
    {
      description: "프로그램별 모집 질문과 동의 항목을 구성합니다.",
      href: "#programs",
      icon: <MessageSquareText size={18} />,
      metric: "프로그램별",
      title: "신청서/메시지",
    },
    {
      description: "활동, 장소, 참석자, 사진 기록을 프로젝트 단위로 모읍니다.",
      href: `${projectPath}/activities`,
      icon: <BarChart3 size={18} />,
      metric: `${project.activityCount}건`,
      title: "활동/참석",
    },
    {
      description: "지출 이벤트와 필요한 증빙 체크리스트를 관리합니다.",
      href: `${projectPath}/evidence`,
      icon: <WalletCards size={18} />,
      metric: `${project.missingEvidenceCount}개 누락`,
      title: "지출/증빙",
    },
    {
      description: "제출 전 준비율과 보완 항목을 확인합니다.",
      href: `${projectPath}/closeout`,
      icon: <FileText size={18} />,
      metric: `${project.readiness}%`,
      title: "마감/보고",
    },
  ];
}

function FeatureTile({ tile }: { tile: FeatureTileModel }) {
  return (
    <Link
      className="group flex min-h-44 flex-col justify-between rounded-md border border-slate-200 bg-white p-4 hover:border-[var(--primary)] hover:bg-teal-50"
      href={tile.href}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
            {tile.icon}
          </span>
          <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">
            {tile.metric}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-950">{tile.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {tile.description}
        </p>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
        열기
        <ArrowRight size={15} />
      </span>
    </Link>
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

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value}
      </p>
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
