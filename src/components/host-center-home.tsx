"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  Loader2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useMemo } from "react";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  hostProgramPath,
  hostProjectPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import type { ProgramStatus } from "@/lib/types";
import { useHostOperationsData } from "@/lib/use-host-operations-data";
import type { HostVillageWorkspace } from "@/lib/host-village-access";

type ProgramListItem = HostProgramOverview & {
  projectId: string;
  projectTitle: string;
  villageName: string;
};

type ProgramGroup = {
  id: "open" | "upcoming" | "closed";
  items: ProgramListItem[];
  label: string;
  tone: string;
};

export function HostCenterHome({
  workspace,
}: {
  workspace: HostVillageWorkspace;
}) {
  const { applications, isLoading, programs, reportProjects } =
    useHostOperationsData();

  const folders = useMemo(
    () => buildHostProjectOverviews(applications, reportProjects, programs),
    [applications, programs, reportProjects],
  );
  const programItems = useMemo(
    () =>
      folders
        .flatMap((folder) =>
          buildHostProgramOverviews(folder, applications).map((program) => ({
            ...program,
            projectId: folder.id,
            projectTitle: folder.title,
            villageName: folder.villageName,
          })),
        )
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [applications, folders],
  );

  const createProgramHref =
    folders[0] ? `${hostProjectPath(folders[0].id)}/programs/new` : "/host/programs";
  const groups = buildProgramGroups(programItems);

  return (
    <main
      aria-label={`${workspace.title} 호스트 홈`}
      className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8"
    >
      <div className="min-h-[calc(100vh-7rem)] border-l border-[#F3E2D5] pl-4 md:pl-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#0D0D0C]">호스트 홈</h1>
          </div>
          <div className="flex items-center gap-1 text-[#A59A92]">
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            <button
              aria-label="프로그램 필터"
              className="grid size-8 place-items-center rounded-md hover:bg-[#FFF6EC] hover:text-[#FE701E]"
              type="button"
            >
              <ListFilter size={15} />
            </button>
            <button
              aria-label="프로그램 정렬"
              className="grid size-8 place-items-center rounded-md hover:bg-[#FFF6EC] hover:text-[#FE701E]"
              type="button"
            >
              <ArrowUpDown size={15} />
            </button>
          </div>
        </header>

        <div className="mt-6 space-y-9">
          {groups.map((group) => (
            <ProgramStatusGroup
              createProgramHref={createProgramHref}
              group={group}
              key={group.id}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function ProgramStatusGroup({
  createProgramHref,
  group,
}: {
  createProgramHref: string;
  group: ProgramGroup;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <ChevronDown size={15} className="text-[#5B3A29]" />
        <span className={`rounded px-2 py-0.5 text-xs font-black ${group.tone}`}>
          {group.label}
        </span>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {group.items.map((program) => (
          <ProgramCard key={`${program.projectId}-${program.id}`} program={program} />
        ))}
        <NewProgramCard href={createProgramHref} />
      </div>
    </section>
  );
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  const status = normalizeProgramStatus(program);
  const href = hostProgramPath(program.projectId, program.id);
  const statusLabel =
    status === "open"
      ? "공개 모집 화면"
      : status === "upcoming"
        ? "모집 준비 화면"
        : "마감 프로그램";

  return (
    <article className="group min-w-0">
      <Link
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-[#FFF6EC] shadow-sm ring-1 ring-[#F3E2D5] transition hover:shadow-md hover:ring-[#FE701E]/40"
        href={href}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          src={program.imageUrl}
        />
        <div className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-black text-[#FE701E] shadow-sm">
          {statusLabel}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white">
          <p className="line-clamp-1 text-sm font-black">{program.villageName}</p>
          <p className="mt-1 text-xs font-bold text-white/75">
            신청 {program.applicationCount}명 · 준비율 {program.readiness}%
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <Link className="block min-w-0" href={href}>
          <h3 className="line-clamp-2 text-base font-black leading-6 text-[#0D0D0C] group-hover:text-[#FE701E]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-sm font-bold text-[#8B7A6E]">
          {program.projectTitle}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-[#8B7A6E]">
          <span>검토 {program.pendingCount}명</span>
          <span>참여 {program.activeCount}명</span>
          {program.pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[#FE701E]">
              <MessageSquare size={13} />
              확인 필요
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function NewProgramCard({ href }: { href: string }) {
  return (
    <Link
      className="grid min-h-48 place-items-center rounded-md border border-dashed border-[#F3C3A5] bg-white text-sm font-black text-[#FE701E] transition hover:border-[#FE701E] hover:bg-[#FFF6EC]"
      href={href}
    >
      <span className="inline-flex items-center gap-2">
        <Plus size={15} />
        새 프로그램 만들기
      </span>
    </Link>
  );
}

function buildProgramGroups(programs: ProgramListItem[]): ProgramGroup[] {
  const openPrograms = programs.filter(
    (program) => normalizeProgramStatus(program) === "open",
  );
  const upcomingPrograms = programs.filter(
    (program) => normalizeProgramStatus(program) === "upcoming",
  );
  const closedPrograms = programs.filter((program) =>
    ["closed", "earlyClosed"].includes(normalizeProgramStatus(program)),
  );

  return [
    {
      id: "open",
      label: "모집중",
      items: openPrograms,
      tone: "bg-[#FFF6EC] text-[#FE701E]",
    },
    {
      id: "upcoming",
      label: "모집예정",
      items: upcomingPrograms,
      tone: "bg-[#F1F5F9] text-[#5B3A29]",
    },
    ...(closedPrograms.length > 0
      ? [
          {
            id: "closed" as const,
            label: "마감",
            items: closedPrograms,
            tone: "bg-slate-100 text-slate-600",
          },
        ]
      : []),
  ];
}

function normalizeProgramStatus(program: HostProgramOverview): ProgramStatus {
  if (program.status) return program.status;
  return program.applicationCount > 0 ? "open" : "upcoming";
}
