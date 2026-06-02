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
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  buildStandaloneHostProgramOverviews,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
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
  projectId?: string;
  projectTitle: string;
  villageName: string;
};

export function HostProgramHome() {
  const { applications, programs, reportProjects, setReportProjects } =
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
    () => {
      const folderProgramItems: ProgramListItem[] = folders
        .flatMap((folder) =>
          buildHostProgramOverviews(folder, applications).map((program) => ({
            ...program,
            projectId: folder.id,
            projectTitle: folder.title,
            villageName: folder.villageName,
          })),
        )
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

      return [...folderProgramItems, ...standaloneProgramItems].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
    },
    [applications, folders, programs, reportProjects],
  );
  const programsByFolder = useMemo(
    () =>
      programItems.reduce<Record<string, ProgramListItem[]>>((acc, program) => {
        if (!program.projectId) return acc;
        acc[program.projectId] = [...(acc[program.projectId] ?? []), program];
        return acc;
      }, {}),
    [programItems],
  );
  const createProgramHref = "/host/programs/new";
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
        <section>
          <SectionTitle
            icon={<FolderOpen size={18} />}
            title="폴더"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {folders.map((folder) => {
              const folderPrograms = programsByFolder[folder.id] ?? [];

              return (
                <FolderCard
                  folder={folder}
                  key={folder.id}
                  programCount={folderPrograms.length}
                  programs={folderPrograms}
                />
              );
            })}
            <NewCard label="새 폴더 만들기" onClick={openFolderDialog} />
          </div>
        </section>

        <section className="mt-10">
          <SectionTitle
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
            <div className="mt-3 rounded-md border border-dashed border-[#F3C3A5] bg-white">
              <NuvioEmptyState
                actionHref={createProgramHref}
                actionLabel="새 프로그램 만들기"
                className="min-h-[280px]"
                label="프로그램"
              />
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
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
    </div>
  );
}

function FolderCard({
  folder,
  programCount,
  programs,
}: {
  folder: HostProjectOverview;
  programCount: number;
  programs: ProgramListItem[];
}) {
  const visiblePrograms = programs.slice(0, 3);
  const remainingProgramCount = programs.length - visiblePrograms.length;

  return (
    <Link
      className="group block rounded-md border border-[#F3E2D5] bg-white p-4 shadow-sm transition hover:border-[#FE701E]/50 hover:shadow-md"
      href={hostProjectPath(folder.id)}
    >
      <div className="flex min-h-52 flex-col justify-between">
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
          <div className="mt-3 space-y-1.5">
            {visiblePrograms.length > 0 ? (
              <>
                {visiblePrograms.map((program) => (
                  <p
                    className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#6F625A]"
                    key={program.id}
                  >
                    <FileText className="shrink-0 text-[#FE701E]" size={12} />
                    <span className="truncate">{program.title}</span>
                  </p>
                ))}
                {remainingProgramCount > 0 ? (
                  <p className="text-xs font-black text-[#FE701E]">
                    + {remainingProgramCount}개 더
                  </p>
                ) : null}
              </>
            ) : (
              <p className="rounded bg-[#FFF6EC] px-2 py-1.5 text-xs font-bold text-[#A06B4F]">
                아직 프로그램 없음
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-[#8B7A6E]">
          프로그램 {programCount}개 · 신청 {folder.applicationCount}명
        </p>
      </div>
    </Link>
  );
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  const href = program.projectId
    ? hostProgramPath(program.projectId, program.id)
    : hostStandaloneProgramPath(program.id);

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
      className="grid min-h-52 place-items-center rounded-md border border-dashed border-[#F3C3A5] bg-white text-sm font-black text-[#FE701E] transition hover:border-[#FE701E] hover:bg-[#FFF6EC]"
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
