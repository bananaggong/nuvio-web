"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
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
import type { ReactNode } from "react";

type ProgramListItem = HostProgramOverview & {
  projectId: string;
  projectTitle: string;
  villageName: string;
};

export function HostProgramHome() {
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
  const createProgramHref = folders[0]
    ? `${hostProjectPath(folders[0].id)}/programs/new`
    : "/host/projects/new";

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="min-h-[calc(100vh-8rem)] border-l border-slate-200 pl-4 md:pl-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              <FolderOpen size={15} />
              프로그램 홈
            </p>
            <h1 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl">
              폴더와 프로그램
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              폴더 {folders.length}개 · 프로그램 {programItems.length}개
              {isLoading ? " · 불러오는 중" : ""}
            </p>
          </div>
          <Link
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            href={createProgramHref}
          >
            <Plus size={16} />
            새 프로그램
          </Link>
        </header>

        <section className="mt-8">
          <SectionTitle
            description="프로그램이 담겨있는 폴더입니다."
            icon={<FolderOpen size={18} />}
            title="폴더"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {folders.map((folder) => (
              <FolderCard
                folder={folder}
                key={folder.id}
                programCount={
                  programItems.filter((program) => program.projectId === folder.id)
                    .length
                }
              />
            ))}
            <NewCard href="/host/projects/new" label="새 폴더" />
          </div>
        </section>

        <section className="mt-10">
          <SectionTitle
            description="최근 수정되었거나 연결된 프로그램부터 보여줍니다."
            icon={<Clock3 size={18} />}
            title="최근 본 프로그램"
          />
          {programItems.length > 0 ? (
            <div className="mt-3 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {programItems.map((program) => (
                <ProgramCard
                  key={`${program.projectId}-${program.id}`}
                  program={program}
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
              <FileText className="mx-auto text-slate-300" size={44} />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                아직 프로그램이 없습니다.
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                폴더를 만든 뒤 프로그램을 추가하면 이곳에 표시됩니다.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                href={createProgramHref}
              >
                <Plus size={16} />
                새 프로그램
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionTitle({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <span className="text-slate-500">{icon}</span>
        {title}
      </h2>
      <p className="text-sm font-bold text-slate-500">{description}</p>
    </div>
  );
}

function FolderCard({
  folder,
  programCount,
}: {
  folder: HostProjectOverview;
  programCount: number;
}) {
  return (
    <Link
      className="group block rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      href={hostProjectPath(folder.id)}
    >
      <div className="flex min-h-28 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
              <FolderOpen size={20} />
            </span>
            <ChevronRight
              className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
              size={18}
            />
          </div>
          <h3 className="mt-4 line-clamp-2 text-base font-black leading-6 text-slate-950">
            {folder.title}
          </h3>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-500">
          프로그램 {programCount}개 · 신청 {folder.applicationCount}명
        </p>
      </div>
    </Link>
  );
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  const href = hostProgramPath(program.projectId, program.id);

  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${program.title} 편집 화면 열기`}
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-slate-300"
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
          <p className="line-clamp-1 text-sm font-black">{program.villageName}</p>
          <p className="mt-1 text-xs font-bold text-white/75">
            신청 {program.applicationCount}명 · 준비율 {program.readiness}%
          </p>
        </div>
      </Link>

      <div className="pt-3">
        <Link className="block min-w-0" href={href}>
          <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
          {program.projectTitle}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-500">
          검토 {program.pendingCount}명 · 참여 {program.activeCount}명
        </p>
      </div>
    </article>
  );
}

function NewCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="grid min-h-40 place-items-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
      href={href}
    >
      <span className="inline-flex items-center gap-2">
        <Plus size={15} />
        {label}
      </span>
    </Link>
  );
}
