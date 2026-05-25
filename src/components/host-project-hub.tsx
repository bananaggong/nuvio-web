"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FolderKanban, Plus } from "lucide-react";
import { useMemo } from "react";
import {
  buildHostProgramOverviews,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProjectHub({ projectId }: { projectId: string }) {
  const { applications, programs: hostPrograms, reportProjects } = useHostOperationsData();

  const project = useMemo(
    () => findHostProjectOverview(projectId, applications, reportProjects, hostPrograms),
    [applications, hostPrograms, projectId, reportProjects],
  );
  const programs = useMemo(
    () => (project ? buildHostProgramOverviews(project, applications) : []),
    [applications, project],
  );

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href="/host/programs"
        >
          <ArrowLeft size={16} />
          프로그램 목록
        </Link>
        <div className="mt-5 rounded-md border border-[#F3E2D5] bg-white p-6">
          <h1 className="text-2xl font-black text-[#0D0D0C]">
            폴더를 찾을 수 없습니다.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#7A6558]">
            프로그램 목록에서 다시 선택하거나 새 폴더를 만들어 주세요.
          </p>
        </div>
      </div>
    );
  }

  const projectPath = hostProjectPath(project.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href="/host/programs"
        >
          <ArrowLeft size={16} />
          프로그램 목록
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white transition hover:bg-[#E85F13]"
          href={`${projectPath}/programs/new`}
        >
          <Plus size={16} />
          새 프로그램
        </Link>
      </div>

      <section className="rounded-md border border-[#F3E2D5] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
              <FolderKanban size={18} />
              폴더
            </p>
            <h1 className="mt-2 break-words text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
              {project.title}
            </h1>
          </div>
          <div className="rounded-md bg-[#FFF6EC] px-3 py-2 text-sm font-black text-[#FE701E]">
            프로그램 {programs.length}개
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-[#F3E2D5] bg-white p-5" id="programs">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
          <span className="text-[#FE701E]">
            <ClipboardList size={18} />
          </span>
          프로그램
        </h2>

        {programs.length > 0 ? (
          <div className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="mt-4 rounded-md border border-dashed border-[#F3C3A5] bg-white p-8 text-center">
            <ClipboardList className="mx-auto text-[#F3C3A5]" size={42} />
            <h3 className="mt-4 text-xl font-black text-[#0D0D0C]">
              아직 프로그램이 없습니다.
            </h3>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white hover:bg-[#E85F13]"
              href={`${projectPath}/programs/new`}
            >
              <Plus size={16} />
              새 프로그램
            </Link>
          </div>
        )}
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
            신청 {program.applicationCount}명
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <Link className="min-w-0" href={programPath}>
          <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {getProgramStatusLabel(program.status)}
        </p>
      </div>
    </article>
  );
}

function getProgramStatusLabel(status: HostProgramOverview["status"]): string {
  if (status === "open") return "모집중";
  if (status === "upcoming") return "모집예정";
  if (status === "closed" || status === "earlyClosed") return "마감";
  return "상태 미정";
}
