"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  mergeHostApplications,
  readHostApplicationsFromStorage,
  seedHostApplications,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
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

export function HostOpsDashboard() {
  const [applications, setApplications] = useState<HostApplication[]>(
    seedHostApplications,
  );
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);

  useEffect(() => {
    let cancelled = false;
    const storageTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setApplications(readStoredApplications());
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <FolderKanban size={18} />
            프로젝트 운영
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            운영중인 프로젝트
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {projects.length}개 프로젝트
          </p>
        </div>
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          href="/host/projects/new"
        >
          <Plus size={16} />
          새 프로젝트
        </Link>
      </div>

      <section className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard project={project} key={project.id} />
        ))}
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

        <p className="mt-1 text-sm font-bold text-slate-500">
          신청 {project.applicationCount}명 · 증빙 {project.missingEvidenceCount}개 ·
          활동 {project.activityCount}건
        </p>
      </div>
    </article>
  );
}

function readStoredApplications(): HostApplication[] {
  return readHostApplicationsFromStorage();
}
