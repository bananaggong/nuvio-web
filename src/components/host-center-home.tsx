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
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  hostProgramPath,
  hostProjectPath,
  type HostProgramOverview,
  type HostProjectOverview,
} from "@/lib/host-projects";
import {
  createReportProject,
  mergeReportProjects,
  type ReportProject,
} from "@/lib/report-automation";
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
  const {
    applications,
    isLoading,
    programs,
    reportProjects,
    setReportProjects,
  } =
    useHostOperationsData();
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");

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
    folders[0] ? `${hostProjectPath(folders[0].id)}/programs/new` : "";

  async function createFolder() {
    const trimmedName = folderName.trim();
    if (!trimmedName || isCreatingFolder) return;

    setIsCreatingFolder(true);
    setFolderError("");

    try {
      const response = await fetch("/api/host/reports", {
        body: JSON.stringify(buildFolderProject(trimmedName, workspace)),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ReportProject;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "폴더를 만들지 못했습니다.");
      }

      setReportProjects((current) => mergeReportProjects([payload.data!], current));
      setFolderName("");
      setFolderModalOpen(false);
    } catch (error) {
      setFolderError(
        error instanceof Error ? error.message : "폴더를 만들지 못했습니다.",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  }

  function openFolderModal() {
    setFolderError("");
    setFolderModalOpen(true);
  }

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
        <button
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          onClick={openFolderModal}
          type="button"
        >
          <Plus size={16} />
          새로 만들기
        </button>
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
          <CreateFolderCard onClick={openFolderModal} />
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
          <CreateProgramCard
            href={createProgramHref}
            onCreateFolderRequired={openFolderModal}
          />
          {programItems.map((program) => (
            <ProgramCard key={`${program.projectId}-${program.id}`} program={program} />
          ))}
        </div>
      </section>
      {folderModalOpen ? (
        <FolderCreateModal
          errorMessage={folderError}
          folderName={folderName}
          isCreating={isCreatingFolder}
          onClose={() => setFolderModalOpen(false)}
          onCreate={() => void createFolder()}
          onNameChange={setFolderName}
        />
      ) : null}
    </main>
  );
}

function CreateFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="group flex min-h-40 flex-col justify-between rounded-md border border-dashed border-slate-300 bg-white p-4 hover:border-[var(--primary)] hover:bg-teal-50"
      onClick={onClick}
      type="button"
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
    </button>
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

function CreateProgramCard({
  href,
  onCreateFolderRequired,
}: {
  href: string;
  onCreateFolderRequired: () => void;
}) {
  const className =
    "group flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-4 text-center hover:border-[var(--primary)] hover:bg-teal-50";
  const content = (
    <>
      <span className="grid size-14 place-items-center rounded-full bg-slate-950 text-white">
        <Plus size={24} />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950">새 프로그램</h3>
      <p className="mt-2 text-sm font-bold text-slate-500 group-hover:text-teal-700">
        모집 프로그램 만들기
      </p>
    </>
  );

  if (!href) {
    return (
      <button className={className} onClick={onCreateFolderRequired} type="button">
        {content}
      </button>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
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

function FolderCreateModal({
  errorMessage,
  folderName,
  isCreating,
  onClose,
  onCreate,
  onNameChange,
}: {
  errorMessage: string;
  folderName: string;
  isCreating: boolean;
  onClose: () => void;
  onCreate: () => void;
  onNameChange: (value: string) => void;
}) {
  const canCreate = Boolean(folderName.trim()) && !isCreating;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
      <form
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-create-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
              <FolderPlus size={17} />
              새 폴더
            </p>
            <h2
              className="mt-2 text-xl font-black text-slate-950"
              id="folder-create-title"
            >
              폴더 이름
            </h2>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-400"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-black text-slate-700">이름</span>
          <input
            autoFocus
            className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold text-slate-950 outline-none focus:border-[var(--primary)]"
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="예: 2026 보성 운영"
            value={folderName}
          />
        </label>

        {errorMessage ? (
          <p className="mt-3 text-sm font-bold text-red-700">{errorMessage}</p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-slate-400"
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canCreate}
            type="submit"
          >
            {isCreating ? <Loader2 className="animate-spin" size={16} /> : null}
            만들기
          </button>
        </div>
      </form>
    </div>
  );
}

function buildFolderProject(
  folderName: string,
  workspace: HostVillageWorkspace,
): ReportProject {
  const now = new Date().toISOString();

  return {
    ...createReportProject(),
    agencyName: `${workspace.title} 운영팀`,
    imageUrl: workspace.heroImage,
    ownerName: "운영 담당자",
    periodLabel: "운영 기간 미정",
    title: folderName,
    updatedAt: now,
    villageId: workspace.villageId,
    villageName: workspace.title,
    villageSlug: workspace.slug,
  };
}
