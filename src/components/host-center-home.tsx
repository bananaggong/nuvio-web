"use client";

import { Loader2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

type FolderProgramFilter = "open" | "upcoming" | "closed";

export function HostCenterHome({
  workspace,
}: {
  workspace: HostVillageWorkspace;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [folderProgramFilter, setFolderProgramFilter] =
    useState<FolderProgramFilter>("open");
  const [selectedFolderProgramIds, setSelectedFolderProgramIds] = useState<string[]>(
    [],
  );
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
  const expandedProgramGroupId = getProgramGroupFromStatus(
    searchParams.get("status"),
  );
  const folderDialogCounts = useMemo(() => {
    return programItems.reduce<Record<FolderProgramFilter, number>>(
      (acc, program) => {
        const status = normalizeProgramStatus(program);
        if (status === "closed" || status === "earlyClosed") {
          acc.closed += 1;
        } else if (status === "upcoming") {
          acc.upcoming += 1;
        } else {
          acc.open += 1;
        }

        return acc;
      },
      { closed: 0, open: 0, upcoming: 0 },
    );
  }, [programItems]);
  const folderDialogPrograms = useMemo(
    () =>
      programItems.filter((program) => {
        const status = normalizeProgramStatus(program);
        if (folderProgramFilter === "closed") {
          return status === "closed" || status === "earlyClosed";
        }

        return status === folderProgramFilter;
      }),
    [folderProgramFilter, programItems],
  );
  const selectedFolderPrograms = useMemo(
    () =>
      programItems.filter((program) => selectedFolderProgramIds.includes(program.id)),
    [programItems, selectedFolderProgramIds],
  );
  const trimmedFolderName = folderName.trim();
  const trimmedProgramName = programName.trim();

  function openFolderDialog() {
    setFolderError("");
    setFolderName("");
    setFolderProgramFilter("open");
    setSelectedFolderProgramIds([]);
    setIsFolderDialogOpen(true);
  }

  function closeFolderDialog() {
    if (isFolderSaving) return;
    setIsFolderDialogOpen(false);
    setFolderError("");
    setFolderName("");
    setFolderProgramFilter("open");
    setSelectedFolderProgramIds([]);
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

  function toggleFolderProgram(programId: string) {
    setSelectedFolderProgramIds((current) =>
      current.includes(programId)
        ? current.filter((id) => id !== programId)
        : [...current, programId],
    );
  }

  async function createFolder() {
    if (!trimmedFolderName || isFolderSaving) return;

    const now = new Date().toISOString();
    const primaryProgram = selectedFolderPrograms[0];
    const nextFolder: ReportProject = {
      ...createReportProject(),
      agencyName: workspace.title || "운영 조직명",
      connectedProgramIds: selectedFolderPrograms.map((program) => program.id),
      connectedProgramTitles: selectedFolderPrograms.map((program) => program.title),
      imageUrl: primaryProgram?.imageUrl || workspace.heroImage,
      ownerName: "운영 담당자",
      periodLabel: "운영 기간 미정",
      programId: primaryProgram?.id ?? "",
      programTitle: primaryProgram?.title ?? trimmedFolderName,
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
      setSelectedFolderProgramIds([]);
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
        <div className="w-[var(--host-1118)] max-w-full pt-[var(--host-24)] max-md:w-full max-md:pt-5">
          <section className="w-fit">
            <HostSectionTitle
              action={
                <HostSmallButton onClick={openFolderDialog}>
                  새폴더 +
                </HostSmallButton>
              }
              title="프로그램 폴더"
            />
            <div className="mt-[var(--host-12)] flex flex-wrap gap-[var(--host-16)] max-md:mt-4">
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
                  className="grid h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] place-items-center rounded-[8px] border border-dashed border-[#F3C3A5] bg-white text-[var(--host-14)] font-medium text-[#FE701E] max-md:w-full"
                  onClick={openFolderDialog}
                  type="button"
                >
                  새 폴더 만들기
                </button>
              )}
            </div>
          </section>

          <section className="mt-[var(--host-32)] max-md:mt-8">
            <HostSectionTitle
              action={<HostSmallButton onClick={openProgramDialog}>새 프로그램 +</HostSmallButton>}
              title="프로그램 현황"
            />
            <div className="mt-[var(--host-12)] grid gap-[var(--host-16)] max-md:mt-5">
              {groups.map((group) => (
                <HostProgramRow
                  actionLabel={group.actionLabel}
                  expanded={expandedProgramGroupId === group.id}
                  items={group.items}
                  key={group.id}
                  statusFilter={group.id}
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
            className="flex w-[var(--host-603)] max-w-[calc(100vw-32px)] flex-col gap-[var(--host-6)] rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[var(--host-18)] py-[var(--host-24)] shadow-[0_18px_48px_rgba(91,58,41,0.14)] max-md:w-full max-md:min-w-0 max-md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createFolder();
            }}
            role="dialog"
          >
            <div className="flex w-full justify-end">
              <button
                aria-label="닫기"
                className="inline-flex size-[var(--host-16)] items-center justify-center text-[#0D0D0C] hover:text-[#FE701E]"
                onClick={closeFolderDialog}
                type="button"
              >
                <X className="size-[var(--host-16)]" strokeWidth={2.2} />
              </button>
            </div>
            <div className="flex w-full flex-col gap-[var(--host-21)]">
              <label
                className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]"
                htmlFor="new-folder-name"
                id="new-folder-title"
              >
                폴더명
              </label>
              <input
                autoFocus
                className="h-[var(--host-30)] w-full rounded-[7px] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                id="new-folder-name"
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="폴더명을 입력하세요."
                value={folderName}
              />
            </div>
            <div className="flex w-full flex-col gap-[var(--host-8)] py-[var(--host-16)]">
              <p className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
                추가할 프로그램을 선택하세요.
              </p>
              <div className="flex w-full items-center gap-[9px]">
                {(["open", "upcoming", "closed"] as const).map((filter) => {
                  const isActive = folderProgramFilter === filter;
                  const label =
                    filter === "open"
                      ? `오픈 (${String(folderDialogCounts.open).padStart(2, "0")})`
                      : filter === "upcoming"
                        ? "예정"
                        : "마감";

                  return (
                    <button
                      className={`flex h-[var(--host-30)] w-[var(--host-110)] items-center justify-center rounded-[20px] text-[var(--host-12)] font-bold leading-[1.253] ${
                        isActive
                          ? "bg-[#FF9A3D] text-[#F9F9F9]"
                          : "bg-[#CAC4BC] text-[#F3F3F3]"
                      }`}
                      key={filter}
                      onClick={() => setFolderProgramFilter(filter)}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="grid w-full grid-cols-3 gap-x-[var(--host-27)] gap-y-[var(--host-12)] p-[var(--host-8)] max-md:grid-cols-1">
                {folderDialogPrograms.length > 0 ? (
                  folderDialogPrograms.slice(0, 6).map((program) => (
                    <label
                      className="flex min-w-0 items-center gap-[var(--host-8)] text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]"
                      key={program.id}
                    >
                      <input
                        checked={selectedFolderProgramIds.includes(program.id)}
                        className="size-[var(--host-14)] shrink-0 appearance-none border border-[#6D7A8A] bg-transparent checked:border-[#FE701E] checked:bg-[#FE701E]"
                        onChange={() => toggleFolderProgram(program.id)}
                        type="checkbox"
                      />
                      <span className="truncate">{program.title}</span>
                    </label>
                  ))
                ) : (
                  <p className="col-span-3 text-[var(--host-12)] font-medium leading-[1.6] text-[#6D7A8A] max-md:col-span-1">
                    선택할 프로그램이 없습니다.
                  </p>
                )}
              </div>
            </div>
            {folderError ? (
              <p className="text-[13px] font-bold text-red-600">{folderError}</p>
            ) : null}
            <div className="flex w-full justify-end">
              <button
                className="inline-flex h-[var(--host-29)] items-center justify-center gap-[var(--host-6)] rounded-[4px] bg-[#FE701E] px-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-40"
                disabled={!trimmedFolderName || isFolderSaving}
                type="submit"
              >
                {isFolderSaving ? (
                  <Loader2 className="size-[var(--host-14)] animate-spin" />
                ) : null}
                생성
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
            className="flex w-[var(--host-603)] max-w-[calc(100vw-32px)] flex-col gap-[var(--host-6)] rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[var(--host-18)] py-[var(--host-24)] shadow-[0_18px_48px_rgba(91,58,41,0.14)] max-md:w-full max-md:min-w-0 max-md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createProgram();
            }}
            role="dialog"
          >
            <div className="flex w-full justify-end">
              <button
                aria-label="닫기"
                className="inline-flex size-[var(--host-16)] items-center justify-center text-[#0D0D0C] hover:text-[#FE701E]"
                onClick={closeProgramDialog}
                type="button"
              >
                <X className="size-[var(--host-16)]" strokeWidth={2.2} />
              </button>
            </div>
            <div className="flex w-full flex-col gap-[var(--host-21)]">
              <label
                className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]"
                htmlFor="new-program-name"
                id="new-program-title"
              >
                새 프로그램
              </label>
              <p className="text-[var(--host-12)] font-medium leading-[1.6] text-[#6D7A8A]">
                프로그램 이름을 입력하고 생성하면 대시보드에서 본격적으로 작성할 수 있습니다.
              </p>
              <input
                autoFocus
                className="h-[var(--host-30)] w-full rounded-[7px] border-[0.5px] border-[#F7B267] bg-transparent px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
                id="new-program-name"
                onChange={(event) => setProgramName(event.target.value)}
                placeholder="프로그램 이름을 입력해주세요."
                value={programName}
              />
            </div>
            {programError ? (
              <p className="text-[13px] font-bold text-red-600">{programError}</p>
            ) : null}
            <div className="flex w-full justify-end gap-[var(--host-8)] pt-[var(--host-12)]">
              <button
                className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]"
                onClick={closeProgramDialog}
                type="button"
              >
                취소
              </button>
              <button
                className="inline-flex h-[var(--host-29)] items-center justify-center gap-[var(--host-6)] rounded-[4px] bg-[#FE701E] px-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-40"
                disabled={!trimmedProgramName || isProgramSaving}
                type="submit"
              >
                {isProgramSaving ? (
                  <Loader2 className="size-[var(--host-14)] animate-spin" />
                ) : null}
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

function getProgramGroupFromStatus(status: string | null): ProgramGroup["id"] | null {
  if (status === "open" || status === "upcoming" || status === "closed") {
    return status;
  }

  return null;
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
