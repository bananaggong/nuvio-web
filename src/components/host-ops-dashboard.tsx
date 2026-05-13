"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Globe2,
  MessageSquareText,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  mergeHostApplications,
  readHostApplicationsFromStorage,
  seedHostApplications,
  seedMessageTemplates,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type {
  HostApplication,
  MessageTemplate,
} from "@/lib/host-operations";
import {
  buildHostProjectOverviews,
  hostProjectPath,
  type HostProjectOverview,
} from "@/lib/host-projects";
import {
  mergeReportProjects,
  readReportProjects,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

const TEMPLATE_STORAGE_KEY = "nuvio:message-templates";

const fallbackActions = [
  {
    href: "/host/programs",
    label: "프로그램 스튜디오",
    helper: "공급 데이터 등록과 공개 발행",
    icon: ClipboardList,
  },
  {
    href: "/host/reports",
    label: "운영 프로젝트 관리",
    helper: "예산, 증빙, 활동 구조 편집",
    icon: FileText,
  },
  {
    href: "/host/villages",
    label: "로컬홈 관리",
    helper: "공개 페이지와 연락처 관리",
    icon: Globe2,
  },
  {
    href: "/host/settings",
    label: "호스트 설정",
    helper: "권한, 기본값, 데이터 관리",
    icon: Settings,
  },
] as const;

export function HostOpsDashboard() {
  const [applications, setApplications] = useState<HostApplication[]>(
    seedHostApplications,
  );
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(seedMessageTemplates);

  useEffect(() => {
    let cancelled = false;
    const storageTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setApplications(readStoredApplications());
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
        // Local fallback data keeps the dashboard usable while the DB is unavailable.
      }
    }

    void loadRemoteState();

    return () => {
      cancelled = true;
      window.clearTimeout(storageTimeoutId);
    };
  }, []);

  const projects = useMemo(
    () => buildHostProjectOverviews(applications, reportProjects),
    [applications, reportProjects],
  );
  const averageReadiness = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.readiness, 0) /
          projects.length,
      )
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
              <FolderKanban size={18} />
              프로젝트 운영
            </p>
            <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              운영중인 프로젝트
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              프로젝트는 예산, 증빙, 활동, 보고를 묶는 상위 운영 단위입니다.
              프로젝트 안에서 공개 모집 프로그램을 만들고 관리합니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href="/host/projects/new"
          >
            <Plus size={16} />
            새 프로젝트
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
            최근 항목
          </span>
          <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
            운영중 {projects.length}개
          </span>
          <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
            평균 준비율 {averageReadiness}%
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard project={project} key={project.id} />
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">프로젝트 운영 도구</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                직접 접근이 필요할 때만 사용하는 전역 도구입니다.
              </p>
            </div>
            <Sparkles className="text-[var(--primary)]" size={20} />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {fallbackActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  className="grid grid-cols-[36px_minmax(0,1fr)_16px] items-center gap-3 rounded-md border border-slate-200 p-3 hover:border-[var(--primary)] hover:bg-teal-50"
                  href={action.href}
                  key={action.href}
                >
                  <span className="grid size-9 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-950">
                      {action.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                      {action.helper}
                    </span>
                  </span>
                  <ArrowRight size={15} className="text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <MessageSquareText className="text-[var(--primary)]" size={20} />
            메시지 템플릿
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            프로젝트 상세에서 신청자 상태에 맞춰 사용할 수 있습니다.
          </p>
          <div className="mt-4 grid gap-2">
            {templates.slice(0, 3).map((template) => (
              <div className="rounded-md bg-slate-50 p-3" key={template.id}>
                <p className="text-xs font-black text-[var(--primary)]">
                  {template.trigger}
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {template.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function ProjectCard({ project }: { project: HostProjectOverview }) {
  const href = hostProjectPath(project.id);

  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${project.title} 운영 화면 열기`}
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-slate-300"
        href={href}
      >
        <Image
          alt={project.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          src={project.imageUrl}
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-white">
          <p className="line-clamp-1 text-sm font-black">{project.villageName}</p>
          <p className="mt-1 text-xs font-bold text-white/75">
            {project.statusLabel} · 준비율 {project.readiness}%
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <Link className="min-w-0" href={href}>
            <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
              {project.title}
            </h3>
          </Link>
          <span className="shrink-0 pt-0.5 text-base font-black text-slate-950">
            {project.pendingCount > 0 ? `검토 ${project.pendingCount}` : `${project.readiness}%`}
          </span>
        </div>

        <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
          {project.periodLabel}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          <ProjectSignal label="신청" value={`${project.applicationCount}명`} />
          <ProjectSignal label="증빙" value={`${project.missingEvidenceCount}개`} />
          <ProjectSignal label="활동" value={`${project.activityCount}건`} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SubFeatureLink href={`${href}/applications`} label="신청자" />
          <SubFeatureLink href={`${href}/forms`} label="신청서" />
          <SubFeatureLink href={`${href}/messages`} label="메시지" />
          <SubFeatureLink href={`${href}/closeout`} label="마감" />
        </div>
      </div>
    </article>
  );
}

function ProjectSignal({ label, value }: { label: string; value: string }) {
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

function readStoredApplications(): HostApplication[] {
  return readHostApplicationsFromStorage();
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
