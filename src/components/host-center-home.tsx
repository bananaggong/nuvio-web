"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import {
  createHostProgramDraft,
  mergeHostProgramDrafts,
  type HostProgramDraft,
} from "@/lib/host-program-studio";
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
  const router = useRouter();
  const {
    applications,
    programs,
    reportProjects,
    setPrograms,
    setReportProjects,
  } = useHostOperationsData();
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [programName, setProgramName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [programError, setProgramError] = useState("");
  const [isFolderSaving, setIsFolderSaving] = useState(false);
  const [isProgramSaving, setIsProgramSaving] = useState(false);

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
  const trimmedProgramName = programName.trim();

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

  function openProgramDialog() {
    setProgramError("");
    setProgramName("");
    setIsProgramDialogOpen(true);
  }

  function closeProgramDialog() {
    if (isProgramSaving) return;
    setIsProgramDialogOpen(false);
    setProgramError("");
    setProgramName("");
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

  async function createProgram() {
    if (!trimmedProgramName || isProgramSaving) return;

    const programDraft = buildStandaloneNewProgramDraft(trimmedProgramName, workspace);

    setIsProgramSaving(true);
    setProgramError("");

    try {
      const response = await fetch("/api/host/programs", {
        body: JSON.stringify(programDraft),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "프로그램을 생성하지 못했습니다.");
      }

      const savedProgram = payload.data;
      setPrograms((current) => mergeHostProgramDrafts([savedProgram], current));
      setIsProgramDialogOpen(false);
      setProgramName("");
      router.push(
        `${hostStandaloneProgramPath(savedProgram.id)}?panel=dashboard&created=1`,
      );
    } catch (error) {
      setProgramError(
        error instanceof Error ? error.message : "프로그램을 생성하지 못했습니다.",
      );
    } finally {
      setIsProgramSaving(false);
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
              action={<HostSmallButton onClick={openProgramDialog}>새 프로그램</HostSmallButton>}
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
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/20 px-4 py-8"
          role="presentation"
        >
          <form
            aria-modal="true"
            aria-labelledby="new-folder-title"
            className="w-[41.875vw] min-w-[360px] max-w-[804px] rounded-[5px] border border-[#F3E2D5] bg-white p-[1.111vw] shadow-[0_18px_48px_rgba(91,58,41,0.14)] max-md:w-full max-md:min-w-0 max-md:p-5"
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
      {isProgramDialogOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/20 px-4 py-8"
          role="presentation"
        >
          <form
            aria-modal="true"
            aria-labelledby="new-program-title"
            className="w-[41.875vw] min-w-[360px] max-w-[804px] rounded-[5px] border border-[#F3E2D5] bg-white p-[1.111vw] shadow-[0_18px_48px_rgba(91,58,41,0.14)] max-md:w-full max-md:min-w-0 max-md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createProgram();
            }}
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-[15px] font-black text-[#33241C]"
                id="new-program-title"
              >
                새 프로그램
              </h2>
              <button
                aria-label="닫기"
                className="inline-flex size-8 items-center justify-center text-[#33241C] hover:text-[#FE701E]"
                onClick={closeProgramDialog}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-[0.556vw] text-[13px] font-bold leading-5 text-[#8B7A6E]">
              프로그램 이름을 입력하고 생성하면 대시보드에서 본격적으로 작성할 수 있습니다.
            </p>
            <input
              autoFocus
              className="mt-[0.833vw] h-[38px] w-full rounded-[4px] border border-[#F3E2D5] px-3 text-[13px] font-bold text-[#33241C] outline-none placeholder:text-[#C8BDB5] focus:border-[#FE701E]"
              onChange={(event) => setProgramName(event.target.value)}
              placeholder="프로그램 이름을 입력해주세요."
              value={programName}
            />
            {programError ? (
              <p className="mt-3 text-[13px] font-bold text-red-600">{programError}</p>
            ) : null}
            <div className="mt-[1.111vw] flex justify-end gap-2">
              <button
                className="h-[32px] rounded-[4px] border border-[#F3E2D5] px-4 text-[12px] font-black text-[#6D7A8A]"
                onClick={closeProgramDialog}
                type="button"
              >
                취소
              </button>
              <button
                className="inline-flex h-[32px] items-center gap-2 rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-black text-white disabled:opacity-40"
                disabled={!trimmedProgramName || isProgramSaving}
                type="submit"
              >
                {isProgramSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                생성하기
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

function buildStandaloneNewProgramDraft(
  title: string,
  workspace: HostVillageWorkspace,
): HostProgramDraft {
  const baseDraft = createHostProgramDraft();
  const now = new Date().toISOString();

  return {
    ...baseDraft,
    id: `draft-${Date.now()}`,
    villageId: workspace.villageId,
    title,
    region: workspace.region,
    city: workspace.city,
    summary: "",
    description: "",
    recruitStart: new Date().toISOString().slice(0, 10),
    recruitEnd: "",
    activityStart: "",
    activityEnd: "",
    target: "",
    capacity: "",
    subsidyLabel: "",
    subsidyAmount: 0,
    fee: "",
    sourceName: workspace.title,
    sourceUrl: `https://nuvio.kr/${workspace.slug}`,
    applyUrl: "",
    phone: "",
    hashtags: [],
    image: workspace.heroImage || "",
    itineraryDays: [],
    placeInfo: {
      ...baseDraft.placeInfo,
      meetingAddress: "",
      meetingAddressDetail: "",
      meetingMemo: "",
      parkingGuide: "",
      transportGuide: "",
    },
    published: false,
    status: "upcoming",
    updatedAt: now,
  };
}

function normalizeProgramStatus(program: HostProgramListItem): ProgramStatus {
  if (program.status) return program.status;
  return program.applicationCount > 0 ? "open" : "upcoming";
}
