"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useMemo } from "react";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  hostProgramPath,
  hostProjectPath,
  type HostProgramOverview,
  type HostProjectOverview,
} from "@/lib/host-projects";
import { useHostOperationsData } from "@/lib/use-host-operations-data";
import type { HostVillageWorkspace } from "@/lib/host-village-access";

type ProgramListItem = HostProgramOverview & {
  projectId: string;
  projectTitle: string;
  villageName: string;
};

const folderSwatches = [
  "bg-[#f0fdfa] text-teal-700 ring-teal-100",
  "bg-[#fff7ed] text-orange-700 ring-orange-100",
  "bg-[#f5f3ff] text-violet-700 ring-violet-100",
  "bg-[#f0f9ff] text-sky-700 ring-sky-100",
];

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
    folders[0] ? `${hostProjectPath(folders[0].id)}/programs/new` : "/host/projects/new";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--primary)]">
            {workspace.title}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            호스트센터
          </h1>
        </div>
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          href="/host/projects/new"
        >
          <Plus size={16} />
          새로 만들기
        </Link>
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">폴더</h2>
          {isLoading ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              불러오는 중
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CreateFolderCard />
          {folders.map((folder, index) => (
            <FolderCard folder={folder} index={index} key={folder.id} />
          ))}
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">프로그램</h2>
          {programItems.length > 0 ? (
            <Link
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/host/programs"
            >
              모두 보기
              <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CreateProgramCard href={createProgramHref} />
          {programItems.map((program) => (
            <ProgramCard key={`${program.projectId}-${program.id}`} program={program} />
          ))}
        </div>
      </section>
    </main>
  );
}

function CreateFolderCard() {
  return (
    <Link
      className="group flex min-h-40 flex-col justify-between rounded-md border border-dashed border-slate-300 bg-white p-4 hover:border-[var(--primary)] hover:bg-teal-50"
      href="/host/projects/new"
    >
      <span className="grid size-11 place-items-center rounded-md bg-slate-950 text-white">
        <FolderPlus size={21} />
      </span>
      <div>
        <h3 className="text-lg font-black text-slate-950">새 폴더 만들기</h3>
        <p className="mt-2 text-sm font-bold text-slate-500 group-hover:text-teal-700">
          운영 단위 만들기
        </p>
      </div>
    </Link>
  );
}

function FolderCard({
  folder,
  index,
}: {
  folder: HostProjectOverview;
  index: number;
}) {
  const swatch = folderSwatches[index % folderSwatches.length];

  return (
    <Link
      className="group flex min-h-40 flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-sm hover:border-[var(--primary)] hover:shadow-md"
      href={hostProjectPath(folder.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 place-items-center rounded-md ring-1 ${swatch}`}>
          <Folder size={22} />
        </span>
        <span className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700">
          <MoreHorizontal size={18} />
        </span>
      </div>
      <div>
        <h3 className="line-clamp-2 text-lg font-black leading-6 text-slate-950">
          {folder.title}
        </h3>
        <p className="mt-2 text-sm font-bold text-slate-500">
          프로그램 {folder.programDrafts.length || folder.connectedProgramTitles.length}개 ·
          신청 {folder.applicationCount}명
        </p>
      </div>
    </Link>
  );
}

function CreateProgramCard({ href }: { href: string }) {
  return (
    <Link
      className="group flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-4 text-center hover:border-[var(--primary)] hover:bg-teal-50"
      href={href}
    >
      <span className="grid size-14 place-items-center rounded-full bg-slate-950 text-white">
        <Plus size={24} />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950">새 프로그램</h3>
      <p className="mt-2 text-sm font-bold text-slate-500 group-hover:text-teal-700">
        모집 프로그램 만들기
      </p>
    </Link>
  );
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  const href = hostProgramPath(program.projectId, program.id);

  return (
    <article className="group min-w-0 rounded-md border border-slate-200 bg-white shadow-sm hover:border-[var(--primary)] hover:shadow-md">
      <Link
        className="relative block aspect-[4/3] overflow-hidden rounded-t-md bg-slate-100"
        href={href}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          src={program.imageUrl}
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-white">
          <p className="line-clamp-1 text-xs font-black text-white/75">
            {program.projectTitle}
          </p>
          <p className="mt-1 line-clamp-1 text-sm font-black">
            {program.villageName}
          </p>
        </div>
      </Link>
      <div className="p-4">
        <Link href={href}>
          <h3 className="line-clamp-2 min-h-12 text-lg font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
            {program.title}
          </h3>
        </Link>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-slate-600">
          <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
            신청 {program.applicationCount}명
          </span>
          <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
            검토 {program.pendingCount}명
          </span>
          <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
            준비 {program.readiness}%
          </span>
        </div>
        <Link
          className="mt-4 inline-flex h-9 items-center gap-2 text-sm font-black text-[var(--primary)]"
          href={href}
        >
          운영 화면
          <ClipboardList size={15} />
        </Link>
      </div>
    </article>
  );
}
