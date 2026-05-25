"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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

type ProgramListItem = HostProgramOverview & {
  projectId: string;
  projectTitle: string;
  villageName: string;
};

export function HostProgramHome() {
  const { applications, isLoading, programs, reportProjects, setReportProjects } =
    useHostOperationsData();
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [isFolderSaving, setIsFolderSaving] = useState(false);

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
    : "";
  const trimmedFolderName = folderName.trim();

  function openFolderDialog() {
    setFolderError("");
    setFolderName("");
    setIsFolderDialogOpen(true);
  }

  function closeFolderDialog() {
    if (isFolderSaving) return;
    setIsFolderDialogOpen(false);
    setFolderError("");
    setFolderName("");
  }

  async function createFolder() {
    if (!trimmedFolderName || isFolderSaving) return;

    const now = new Date().toISOString();
    const nextFolder: ReportProject = {
      ...createReportProject(),
      agencyName: "운영 조직명",
      connectedProgramTitles: [],
      ownerName: "운영 담당자",
      periodLabel: "운영 기간 미정",
      title: trimmedFolderName,
      updatedAt: now,
      villageName: "로컬페이지",
    };

    setIsFolderSaving(true);
    setFolderError("");

    try {
      const response = await fetch("/api/host/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextFolder),
      });
      const payload = (await response.json()) as {
        data?: ReportProject;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "폴더 저장에 실패했습니다.");
      }

      setReportProjects((current) =>
        mergeReportProjects([payload.data as ReportProject], current),
      );
      setIsFolderDialogOpen(false);
      setFolderName("");
    } catch (error) {
      setFolderError(
        error instanceof Error ? error.message : "폴더 저장에 실패했습니다.",
      );
    } finally {
      setIsFolderSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="min-h-[calc(100vh-7rem)] border-l border-[#F3E2D5] pl-4 md:pl-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0D0D0C] sm:text-3xl">
              폴더와 최근 프로그램
            </h1>
            <p className="mt-2 text-sm font-bold text-[#8B7A6E]">
              폴더 {folders.length}개 · 프로그램 {programItems.length}개
              {isLoading ? " · 불러오는 중" : ""}
            </p>
          </div>
          {createProgramHref ? (
            <Link
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white transition hover:bg-[#E85F13]"
              href={createProgramHref}
            >
              <Plus size={16} />
              새 프로그램 만들기
            </Link>
          ) : null}
        </header>

        <section className="mt-8">
          <SectionTitle
            description="프로그램이 담겨있는 폴더입니다."
            icon={<FolderOpen size={18} />}
            title="폴더"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            <NewCard label="새 폴더 만들기" onClick={openFolderDialog} />
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
            <div className="mt-3 rounded-md border border-dashed border-[#F3C3A5] bg-white p-10 text-center">
              <FileText className="mx-auto text-[#F3C3A5]" size={44} />
              <h2 className="mt-4 text-xl font-black text-[#0D0D0C]">
                아직 프로그램이 없습니다.
              </h2>
              <p className="mt-2 text-sm font-bold text-[#8B7A6E]">
                폴더를 만든 뒤 프로그램을 추가하면 이곳에 표시됩니다.
              </p>
              {createProgramHref ? (
                <Link
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white hover:bg-[#E85F13]"
                  href={createProgramHref}
                >
                  <Plus size={16} />
                  새 프로그램 만들기
                </Link>
              ) : (
                <button
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white hover:bg-[#E85F13]"
                  onClick={openFolderDialog}
                  type="button"
                >
                  <Plus size={16} />
                  새 폴더 만들기
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      {isFolderDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4"
          role="presentation"
        >
          <form
            aria-modal="true"
            aria-labelledby="new-folder-title"
            className="w-full max-w-sm rounded-md border border-[#F3E2D5] bg-white p-5 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void createFolder();
            }}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-black text-[#0D0D0C]"
                  id="new-folder-title"
                >
                  새 폴더 만들기
                </h2>
                <p className="mt-1 text-sm font-bold text-[#8B7A6E]">
                  폴더 이름만 입력하면 바로 목록에 추가됩니다.
                </p>
              </div>
              <button
                aria-label="닫기"
                className="grid size-8 shrink-0 place-items-center rounded-md text-[#8B7A6E] hover:bg-[#FFF6EC] hover:text-[#FE701E]"
                onClick={closeFolderDialog}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-black text-[#5B3A29]">폴더 이름</span>
              <input
                autoFocus
                className="h-11 rounded-md border border-[#E6D6CA] px-3 text-sm font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="예: 여름 시즌 프로그램"
                value={folderName}
              />
            </label>

            {folderError ? (
              <p className="mt-3 text-sm font-bold text-red-600">{folderError}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-[#E6D6CA] px-4 text-sm font-black text-[#5B3A29] hover:bg-[#FFF6EC]"
                onClick={closeFolderDialog}
                type="button"
              >
                취소
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!trimmedFolderName || isFolderSaving}
                type="submit"
              >
                {isFolderSaving ? <Loader2 className="animate-spin" size={15} /> : null}
                만들기
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
      <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
      <p className="text-sm font-bold text-[#8B7A6E]">{description}</p>
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
      className="group block rounded-md border border-[#F3E2D5] bg-white p-4 shadow-sm transition hover:border-[#FE701E]/50 hover:shadow-md"
      href={hostProjectPath(folder.id)}
    >
      <div className="flex min-h-32 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#FFF6EC] text-[#FE701E]">
              <FolderOpen size={20} />
            </span>
            <ChevronRight
              className="mt-1 shrink-0 text-[#C7B6AA] transition group-hover:translate-x-0.5 group-hover:text-[#FE701E]"
              size={18}
            />
          </div>
          <h3 className="mt-4 line-clamp-2 text-base font-black leading-6 text-[#0D0D0C]">
            {folder.title}
          </h3>
        </div>
        <p className="mt-3 text-sm font-bold text-[#8B7A6E]">
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
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-[#FFF6EC] shadow-sm ring-1 ring-[#F3E2D5] transition group-hover:shadow-md group-hover:ring-[#FE701E]/40"
        href={href}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          src={program.imageUrl}
        />
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
        <p className="mt-1 text-sm font-bold text-[#8B7A6E]">
          검토 {program.pendingCount}명 · 참여 {program.activeCount}명
        </p>
      </div>
    </article>
  );
}

function NewCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="grid min-h-40 place-items-center rounded-md border border-dashed border-[#F3C3A5] bg-white text-sm font-black text-[#FE701E] transition hover:border-[#FE701E] hover:bg-[#FFF6EC]"
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        <Plus size={15} />
        {label}
      </span>
    </button>
  );
}
