"use client";

import { Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  HostFolderCard,
  HostProgramRow,
  HostSectionTitle,
  HostSmallButton,
  HostWorkspaceContent,
  HostWorkspaceLayout,
  type HostProgramListItem,
} from "@/components/host-workspace-ui";
import {
  buildHostProgramOverviews,
  buildHostProjectOverviews,
  buildStandaloneHostProgramOverviews,
} from "@/lib/host-projects";
import {
  createReportProject,
  mergeReportProjects,
  type ReportProject,
} from "@/lib/report-automation";
import type { ProgramStatus } from "@/lib/types";
import { useHostOperationsData } from "@/lib/use-host-operations-data";
import type { HostVillageWorkspace } from "@/lib/host-village-access";

type ProgramGroup = {
  actionLabel: string;
  id: "open" | "upcoming" | "closed";
  items: HostProgramListItem[];
  title: string;
};

export function HostCenterHome({
  workspace,
}: {
  workspace: HostVillageWorkspace;
}) {
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
  const programItems = useMemo(() => {
    const folderProgramItems: HostProgramListItem[] = folders.flatMap((folder) =>
      buildHostProgramOverviews(folder, applications).map((program) => ({
        ...program,
        projectId: folder.id,
        projectTitle: folder.title,
        villageName: folder.villageName,
      })),
    );
    const standaloneProgramItems: HostProgramListItem[] =
      buildStandaloneHostProgramOverviews(
        applications,
        reportProjects,
        programs,
      ).map((program) => ({
        ...program,
        projectId: undefined,
        projectTitle: "폴더 없음",
        villageName: workspace.title,
      }));

    return [...folderProgramItems, ...standaloneProgramItems].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );
  }, [applications, folders, programs, reportProjects, workspace.title]);
  const programsByFolder = useMemo(
    () =>
      programItems.reduce<Record<string, HostProgramListItem[]>>((acc, program) => {
        if (!program.projectId) return acc;
        acc[program.projectId] = [...(acc[program.projectId] ?? []), program];
        return acc;
      }, {}),
    [programItems],
  );
  const groups = useMemo(() => buildProgramGroups(programItems), [programItems]);
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
      agencyName: workspace.title || "운영 조직명",
      connectedProgramTitles: [],
      ownerName: "운영 담당자",
      periodLabel: "운영 기간 미정",
      title: trimmedFolderName,
      updatedAt: now,
      villageName: workspace.title,
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
    <HostWorkspaceLayout>
      <HostWorkspaceContent>
        <div className="w-full max-w-[77.639vw] pt-[1.667vw] max-md:max-w-none max-md:pt-5">
          <section className="w-fit">
            <HostSectionTitle
              action={
                <HostSmallButton onClick={openFolderDialog}>
                  새폴더 +
                </HostSmallButton>
              }
              title="프로그램 폴더"
            />
            <div className="mt-[0.833vw] flex flex-wrap gap-[1.111vw] max-md:mt-4">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <HostFolderCard
                    folder={folder}
                    key={folder.id}
                    programCount={(programsByFolder[folder.id] ?? []).length}
                    programs={programsByFolder[folder.id] ?? []}
                  />
                ))
              ) : (
                <button
                  className="grid h-[24.375vw] min-h-[351px] w-[20vw] min-w-[288px] place-items-center rounded-[5px] border border-dashed border-[#F3C3A5] bg-white text-[13px] font-black text-[#FE701E] max-md:w-full"
                  onClick={openFolderDialog}
                  type="button"
                >
                  새 폴더 만들기
                </button>
              )}
            </div>
          </section>

          <section className="mt-[2.222vw] max-md:mt-8">
            <HostSectionTitle
              action={<HostSmallButton>프로그램추가 +</HostSmallButton>}
              title="프로그램 현황"
            />
            <div className="mt-[0.833vw] grid gap-[1.111vw] max-md:mt-5">
              {groups.map((group) => (
                <HostProgramRow
                  actionLabel={group.actionLabel}
                  items={group.items}
                  key={group.id}
                  title={group.title}
                />
              ))}
            </div>
          </section>
        </div>
      </HostWorkspaceContent>

      {isFolderDialogOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-black/20 px-4 py-[calc(4.861vw+24px)]"
          role="presentation"
        >
          <form
            aria-modal="true"
            aria-labelledby="new-folder-title"
            className="ml-[3.056vw] w-[41.875vw] min-w-[360px] max-w-[603px] rounded-[5px] border border-[#F3E2D5] bg-white p-[1.111vw] shadow-[0_18px_48px_rgba(91,58,41,0.14)] max-md:mx-auto max-md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createFolder();
            }}
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-black text-[#33241C]" id="new-folder-title">
                폴더명
              </h2>
              <button
                aria-label="닫기"
                className="inline-flex size-8 items-center justify-center text-[#33241C] hover:text-[#FE701E]"
                onClick={closeFolderDialog}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-[0.833vw] h-[38px] w-full rounded-[4px] border border-[#F3E2D5] px-3 text-[13px] font-bold text-[#33241C] outline-none placeholder:text-[#C8BDB5] focus:border-[#FE701E]"
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="폴더명을 입력해주세요."
              value={folderName}
            />
            {folderError ? (
              <p className="mt-3 text-[13px] font-bold text-red-600">{folderError}</p>
            ) : null}
            <div className="mt-[1.111vw] flex justify-end gap-2">
              <button
                className="h-[32px] rounded-[4px] border border-[#F3E2D5] px-4 text-[12px] font-black text-[#6D7A8A]"
                onClick={closeFolderDialog}
                type="button"
              >
                취소
              </button>
              <button
                className="inline-flex h-[32px] items-center gap-2 rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-black text-white disabled:opacity-40"
                disabled={!trimmedFolderName || isFolderSaving}
                type="submit"
              >
                {isFolderSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                저장
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </HostWorkspaceLayout>
  );
}

function buildProgramGroups(programs: HostProgramListItem[]): ProgramGroup[] {
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
      actionLabel: "등록",
      id: "open",
      items: openPrograms,
      title: "오픈된 프로그램",
    },
    {
      actionLabel: "모집 취소",
      id: "upcoming",
      items: upcomingPrograms,
      title: "예정된 프로그램",
    },
    {
      actionLabel: "삭제",
      id: "closed",
      items: closedPrograms,
      title: "마감된 프로그램",
    },
  ];
}

function normalizeProgramStatus(program: HostProgramListItem): ProgramStatus {
  if (program.status) return program.status;
  return program.applicationCount > 0 ? "open" : "upcoming";
}
