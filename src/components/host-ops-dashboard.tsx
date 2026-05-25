"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClipboardList,
  FolderKanban,
  Plus,
} from "lucide-react";
import { useMemo } from "react";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  buildStandaloneHostProgramOverviews,
  hostProgramPath,
  hostStandaloneProgramPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type ProgramListItem = HostProgramOverview & {
  projectId?: string;
  projectTitle: string;
  villageName: string;
};

export function HostOpsDashboard() {
  const { applications, programs, reportProjects } = useHostOperationsData();

  const projects = useMemo(
    () => buildHostProjectOverviews(applications, reportProjects, programs),
    [applications, programs, reportProjects],
  );
  const programItems = useMemo(
    () => {
      const projectProgramItems: ProgramListItem[] = projects.flatMap((project) =>
        buildHostProgramOverviews(project, applications).map((program) => ({
          ...program,
          projectId: project.id,
          projectTitle: project.title,
          villageName: project.villageName,
        })),
      );
      const standaloneProgramItems: ProgramListItem[] = buildStandaloneHostProgramOverviews(
        applications,
        reportProjects,
        programs,
      ).map((program) => ({
        ...program,
        projectId: undefined,
        projectTitle: "폴더 없음",
        villageName: "독립 프로그램",
      }));

      return [...projectProgramItems, ...standaloneProgramItems];
    },
    [applications, programs, projects, reportProjects],
  );
  const createProgramHref = "/host/programs/new";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <FolderKanban size={18} />
            폴더 운영
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            운영중인 프로그램
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {programItems.length}개 프로그램 · {projects.length}개 폴더
          </p>
        </div>
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          href={createProgramHref}
        >
          <Plus size={16} />
          새 프로그램
        </Link>
      </div>

      {programItems.length > 0 ? (
        <section className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {programItems.map((program) => (
            <ProgramCard
              key={`${program.projectId}-${program.id}`}
              program={program}
            />
          ))}
        </section>
      ) : (
        <section className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <ClipboardList className="mx-auto text-slate-300" size={44} />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            아직 운영중인 프로그램이 없습니다.
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-500">
            프로그램을 만들면 이곳에 모여 보입니다. 필요하면 폴더에 연결할 수 있습니다.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href={createProgramHref}
          >
            <Plus size={16} />새 프로그램
          </Link>
        </section>
      )}
    </div>
  );
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  const href = program.projectId
    ? hostProgramPath(program.projectId, program.id)
    : hostStandaloneProgramPath(program.id);

  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${program.title} 운영 화면 열기`}
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-slate-300"
        href={href}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          src={program.imageUrl}
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-white">
          <p className="line-clamp-1 text-sm font-black">{program.villageName}</p>
          <p className="mt-1 text-xs font-bold text-white/75">
            모집/검토 · 준비율 {program.readiness}%
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <Link className="min-w-0" href={href}>
            <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
              {program.title}
            </h3>
          </Link>
          <span className="shrink-0 pt-0.5 text-base font-black text-slate-950">
            {program.pendingCount > 0
              ? `검토 ${program.pendingCount}`
              : `${program.readiness}%`}
          </span>
        </div>

        <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
          {program.projectTitle}
        </p>

        <p className="mt-1 text-sm font-bold text-slate-500">
          신청 {program.applicationCount}명 · 증빙 {program.missingEvidenceCount}개 ·
          참여 {program.activeCount}명
        </p>
      </div>
    </article>
  );
}
