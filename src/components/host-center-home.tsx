"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  ChevronDown,
  FileText,
  Grid2X2,
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
  label: string;
  items: ProgramListItem[];
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
    folders[0] ? `${hostProjectPath(folders[0].id)}/programs/new` : "/host/projects";
  const groups = buildProgramGroups(programItems);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="min-h-[calc(100vh-8rem)] border-l border-slate-200 pl-4 md:pl-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              <Grid2X2 size={15} />
              <span className="truncate">{workspace.title} 프로그램만</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            <button
              aria-label="프로그램 필터"
              className="grid size-8 place-items-center rounded-md hover:bg-slate-100 hover:text-slate-700"
              type="button"
            >
              <ListFilter size={15} />
            </button>
            <button
              aria-label="프로그램 정렬"
              className="grid size-8 place-items-center rounded-md hover:bg-slate-100 hover:text-slate-700"
              type="button"
            >
              <ArrowUpDown size={15} />
            </button>
          </div>
        </header>

        <div className="mt-5 space-y-8">
          {groups.map((group) => (
            <ProgramStatusGroup
              createProgramHref={createProgramHref}
              group={group}
              key={group.id}
            />
          ))}
        </div>

        <p className="mt-8 text-sm font-bold text-slate-500">
          홈에서는 프로그램만 바로 나타나요.
        </p>
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
        <ChevronDown size={15} className="text-slate-700" />
        <span className={`rounded px-2 py-0.5 text-xs font-black ${group.tone}`}>
          {group.label}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
  const noteLabel =
    status === "open"
      ? "(b2c보여지는 화면)"
      : status === "upcoming"
        ? "(b2b 제작 화면 / 크게 볼 것)"
        : "(마감된 화면)";

  return (
    <Link
      className="group block overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
      href={href}
    >
      <div className="h-36 bg-slate-50 p-3">
        <div
          className={`w-full truncate rounded px-2 py-1 text-xs font-bold ${
            status === "open"
              ? "bg-orange-50 text-orange-800"
              : status === "upcoming"
                ? "bg-sky-50 text-sky-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {noteLabel}
        </div>
      </div>
      <div className="flex min-h-16 items-center justify-between gap-3 border-t border-slate-200 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="shrink-0 text-slate-400" size={17} />
          <span className="truncate text-sm font-black text-slate-800 group-hover:text-slate-950">
            {program.title}
          </span>
        </div>
        {program.pendingCount > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
            <MessageSquare size={13} />
            {program.pendingCount}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function NewProgramCard({ href }: { href: string }) {
  return (
    <Link
      className="grid min-h-48 place-items-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
      href={href}
    >
      <span className="inline-flex items-center gap-2">
        <Plus size={15} />
        New page
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
      tone: "bg-orange-100 text-orange-800",
    },
    {
      id: "upcoming",
      label: "모집예정",
      items: upcomingPrograms,
      tone: "bg-sky-100 text-sky-800",
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
