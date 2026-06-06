"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useState } from "react";
import {
  HostFolderInsideHeader,
  HostWorkspaceContent,
  HostWorkspaceLayout,
  type HostProgramListItem,
} from "@/components/host-workspace-ui";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  createHostProgramDraft,
  mergeHostProgramDrafts,
} from "@/lib/host-program-studio";
import {
  buildHostProgramOverviews,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
} from "@/lib/host-projects";
import {
  mergeReportProjects,
  type ReportProject,
} from "@/lib/report-automation";
import type { ProgramStatus } from "@/lib/types";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProjectHub({ projectId }: { projectId: string }) {
  const router = useRouter();
  const {
    applications,
    programs: hostPrograms,
    reportProjects,
    setPrograms,
    setReportProjects,
  } = useHostOperationsData();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProgramTitle, setNewProgramTitle] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedDeleteProgramIds, setSelectedDeleteProgramIds] = useState<string[]>(
    [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const project = findHostProjectOverview(
    projectId,
    applications,
    reportProjects,
    hostPrograms,
  );
  const programs: HostProgramListItem[] = project
    ? buildHostProgramOverviews(project, applications).map((program) => ({
        ...program,
        projectId: project.id,
        projectTitle: project.title,
        villageName: project.villageName,
      }))
    : [];

  if (!project) {
    return (
      <HostWorkspaceLayout sidebarHeight="min-h-[366px]">
        <HostWorkspaceContent insideFolder>
          <div className="pt-[1.667vw]">
            <Link
              className="inline-flex h-8 items-center rounded-[4px] border border-[#F3E2D5] px-3 text-[13px] font-black text-[#5B3A29]"
              href="/host"
            >
              내 프로그램
            </Link>
            <div className="mt-5 rounded-[5px] border border-[#F3E2D5] bg-white p-5">
              <h1 className="text-[18px] font-black text-[#33241C]">
                폴더를 찾을 수 없습니다.
              </h1>
            </div>
          </div>
        </HostWorkspaceContent>
      </HostWorkspaceLayout>
    );
  }

  const activeProject = project;
  const projectPath = hostProjectPath(activeProject.id);

  async function saveReportProject(nextProject: ReportProject) {
    setIsSaving(true);
    setActionError("");

    try {
      const response = await fetch("/api/host/reports", {
        body: JSON.stringify(nextProject),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ReportProject;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "폴더 정보를 저장하지 못했습니다.");
      }

      setReportProjects((current) =>
        current.some((item) => item.id === payload.data?.id)
          ? current.map((item) =>
              item.id === payload.data?.id ? (payload.data as ReportProject) : item,
            )
          : [payload.data as ReportProject, ...current],
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "폴더 정보를 저장하지 못했습니다.",
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function createProgram() {
    const baseProject = resolveReportProject(
      activeProject.id,
      reportProjects,
      activeProject.reportProject,
    );
    const trimmedTitle = newProgramTitle.trim();
    if (!baseProject || !trimmedTitle || isSaving) return;

    const programDraft = buildNewProgramDraft(trimmedTitle, baseProject);

    setIsSaving(true);
    setActionError("");

    try {
      const programResponse = await fetch("/api/host/programs", {
        body: JSON.stringify(programDraft),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const programPayload = (await programResponse.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!programResponse.ok || !programPayload.data) {
        throw new Error(programPayload.error ?? "프로그램을 생성하지 못했습니다.");
      }

      const savedProgram = programPayload.data;
      const nextProject = {
        ...baseProject,
        programId: baseProject.programId || savedProgram.id,
        connectedProgramIds: Array.from(
          new Set([...baseProject.connectedProgramIds, savedProgram.id]),
        ),
        connectedProgramTitles: Array.from(
          new Set([...baseProject.connectedProgramTitles, savedProgram.title]),
        ),
        updatedAt: new Date().toISOString(),
      } satisfies ReportProject;

      const reportResponse = await fetch("/api/host/reports", {
        body: JSON.stringify(nextProject),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const reportPayload = (await reportResponse.json()) as {
        data?: ReportProject;
        error?: string;
      };

      if (!reportResponse.ok || !reportPayload.data) {
        throw new Error(reportPayload.error ?? "폴더에 프로그램을 연결하지 못했습니다.");
      }

      setPrograms((current) => mergeHostProgramDrafts([savedProgram], current));
      setReportProjects((current) =>
        mergeReportProjects([reportPayload.data as ReportProject], current),
      );
      setNewProgramTitle("");
      setIsCreateDialogOpen(false);
      router.push(
        `${hostProgramPath(activeProject.id, savedProgram.id)}?panel=dashboard&created=1`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "프로그램을 생성하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedPrograms() {
    const baseProject = resolveReportProject(
      activeProject.id,
      reportProjects,
      activeProject.reportProject,
    );
    if (!baseProject || selectedDeleteProgramIds.length === 0 || isSaving) return;

    const selectedPrograms = programs.filter((program) =>
      selectedDeleteProgramIds.includes(program.id),
    );
    const deleteIds = new Set(selectedPrograms.map((program) => program.id));
    const deleteTitles = new Set(selectedPrograms.map((program) => program.title));

    await saveReportProject({
      ...baseProject,
      connectedProgramIds: baseProject.connectedProgramIds.filter(
        (id) => !deleteIds.has(id),
      ),
      connectedProgramTitles: baseProject.connectedProgramTitles.filter(
        (title) => !deleteTitles.has(title),
      ),
      programId: deleteIds.has(baseProject.programId ?? "") ? "" : baseProject.programId,
      programTitle: deleteTitles.has(baseProject.programTitle)
        ? "전체 프로그램"
        : baseProject.programTitle,
      updatedAt: new Date().toISOString(),
    });
    setSelectedDeleteProgramIds([]);
    setIsDeleteMode(false);
  }

  function toggleDeleteProgram(programId: string) {
    setSelectedDeleteProgramIds((current) =>
      current.includes(programId)
        ? current.filter((id) => id !== programId)
        : [...current, programId],
    );
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[366px]">
      <HostWorkspaceContent insideFolder>
        <div className="relative w-full pt-[1.667vw] max-md:pt-5">
          <HostFolderInsideHeader
            count={programs.length}
            deleteActive={isDeleteMode}
            onAdd={() => {
              setActionError("");
              setIsDeleteMode(false);
              setSelectedDeleteProgramIds([]);
              setNewProgramTitle("");
              setIsCreateDialogOpen(true);
            }}
            onDelete={() => {
              setActionError("");
              setIsCreateDialogOpen(false);
              setNewProgramTitle("");
              setSelectedDeleteProgramIds([]);
              setIsDeleteMode((current) => !current);
            }}
            title={activeProject.title}
          />
          {actionError ? (
            <p className="mt-3 text-[13px] font-medium text-red-600">{actionError}</p>
          ) : null}

          {programs.length > 0 ? (
            <div className="mt-[1.528vw] inline-grid grid-cols-[repeat(4,fit-content(100%))] gap-[1.111vw] pl-[1.389vw] pr-[0.833vw] max-xl:grid-cols-[repeat(3,fit-content(100%))] max-lg:grid-cols-[repeat(2,fit-content(100%))] max-md:grid-cols-1 max-md:pl-0">
              {programs.slice(0, 8).map((program) => {
                const draft = activeProject.programDrafts.find(
                  (item) =>
                    item.id === program.id ||
                    item.slug === program.slug ||
                    item.title === program.title,
                );

                return (
                  <InsideFolderProgramCard
                    draft={draft}
                    key={program.id}
                    onToggleSelect={() => toggleDeleteProgram(program.id)}
                    program={program}
                    projectPath={projectPath}
                    selectable={isDeleteMode}
                    selected={selectedDeleteProgramIds.includes(program.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-[1.528vw] grid h-[300px] w-[70.833vw] max-w-[1360px] place-items-center rounded-[5px] border border-dashed border-[#F3C3A5] bg-white text-[13px] font-semibold text-[#FE701E] max-md:w-full">
              저장된 프로그램이 없습니다.
            </div>
          )}
          {isDeleteMode ? (
            <div className="mt-[1.806vw] flex justify-end gap-[0.625vw]">
              <button
                className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#CAC4BC] px-[1.25vw] text-[12px] font-medium leading-[1.253] text-[#FFF6EC]"
                disabled={isSaving}
                onClick={() => {
                  setIsDeleteMode(false);
                  setSelectedDeleteProgramIds([]);
                  setActionError("");
                }}
                type="button"
              >
                취소
              </button>
              <button
                className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[1.25vw] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-45"
                disabled={selectedDeleteProgramIds.length === 0 || isSaving}
                onClick={() => void deleteSelectedPrograms()}
                type="button"
              >
                삭제
              </button>
            </div>
          ) : null}
          {isCreateDialogOpen ? (
            <NewProgramDialog
              isSaving={isSaving}
              onClose={() => {
                setIsCreateDialogOpen(false);
                setNewProgramTitle("");
              }}
              onCreate={() => void createProgram()}
              onTitleChange={setNewProgramTitle}
              title={newProgramTitle}
            />
          ) : null}
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function NewProgramDialog({
  isSaving,
  onClose,
  onCreate,
  onTitleChange,
  title,
}: {
  isSaving: boolean;
  onClose: () => void;
  onCreate: () => void;
  onTitleChange: (title: string) => void;
  title: string;
}) {
  const canCreate = title.trim().length > 0 && !isSaving;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/20 px-4 py-8">
      <form
        className="w-[41.875vw] min-w-[603px] max-w-[804px] rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[1.25vw] py-[1.667vw] shadow-[0_18px_50px_rgba(0,0,0,0.12)] max-md:w-full max-md:min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          if (canCreate) onCreate();
        }}
      >
        <div className="flex justify-end">
          <button
            aria-label="닫기"
            className="inline-flex size-4 items-center justify-center text-[#0D0D0C]"
            onClick={onClose}
            type="button"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-2 grid gap-[10px]">
          <p className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
            새 프로그램 이름을 입력해주세요.
          </p>
          <input
            autoFocus
            className="h-[40px] rounded-[6px] border border-[#CAC4BC] bg-white px-3 text-[14px] font-medium leading-[1.253] text-[#0D0D0C] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FF9A3D] focus:ring-2 focus:ring-[#FF9A3D]/15"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="프로그램 이름"
            value={title}
          />
        </div>
        <div className="mt-[1.111vw] flex justify-end">
          <button
            className="inline-flex h-[29px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[1.25vw] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-45"
            disabled={!canCreate}
            type="submit"
          >
            {isSaving ? "생성 중" : "생성하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InsideFolderProgramCard({
  draft,
  onToggleSelect,
  program,
  projectPath,
  selectable = false,
  selected = false,
}: {
  draft?: HostProgramDraft;
  onToggleSelect?: () => void;
  program: HostProgramListItem;
  projectPath: string;
  selectable?: boolean;
  selected?: boolean;
}) {
  const status = program.status ?? "open";
  const statusMeta = getInsideFolderStatusMeta(status);
  const href = `${projectPath}/programs/${encodeURIComponent(program.id)}`;
  const isMetricPending = status === "upcoming" && program.applicationCount === 0;
  const programNumber = program.id
    .replace(/^draft-/u, "")
    .replace(/^program-/u, "")
    .slice(0, 9);
  const periodLabel =
    draft?.activityStart && draft.activityEnd
      ? `${formatCompactDate(draft.activityStart)}-${formatCompactDate(draft.activityEnd)}`
      : "프로그램 기간";
  const dateLabel =
    status === "closed" || status === "earlyClosed"
      ? `마감일 :${draft?.recruitEnd ? ` ${formatCompactDate(draft.recruitEnd)}` : ""}`
      : `오픈일 :${draft?.recruitStart ? ` ${formatCompactDate(draft.recruitStart)}` : ""}`;

  const cardClassName = `relative block w-[16.319vw] min-w-[235px] rounded-[8px] border border-[#D9D9D9] p-[0.833vw] text-left text-[#0D0D0C] transition hover:border-[#FE701E] max-md:w-full ${
    selectable ? "bg-[#F3F3F3]" : "bg-white"
  }`;
  const cardBody = (
    <>
      {selectable ? (
        <span
          className={`absolute left-[0.833vw] top-[0.833vw] z-10 grid size-[14px] place-items-center border border-[#6D7A8A] bg-[#D9D9D9] text-[10px] leading-none text-[#FE701E] ${
            selected ? "bg-white" : ""
          }`}
        >
          {selected ? "✓" : ""}
        </span>
      ) : null}
      <div className={selectable ? "opacity-45" : ""}>
        <div className="flex items-center gap-[0.694vw]">
          <div className="relative h-[5.694vw] min-h-[82px] w-[4.792vw] min-w-[69px] shrink-0 overflow-hidden rounded-[6px] bg-[#D9D9D9]">
            {program.imageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="92px"
                src={program.imageUrl}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-[12px] font-normal leading-[1.253]">
              프로그램 넘버{" "}
              <span className="text-[#FE701E]">{programNumber || "000000000"}</span>
            </p>
            <p className="line-clamp-2 text-[14px] font-medium leading-[1.253]">
              {program.title}
            </p>
            <div className="flex flex-col gap-1 text-[12px] font-normal leading-[1.253]">
              <p className="truncate">{periodLabel}</p>
              <p className="truncate">{dateLabel}</p>
            </div>
          </div>
        </div>
        <div className="mt-[0.486vw] flex items-center gap-[0.417vw] text-[12px] font-normal leading-[1.253]">
          <p className="whitespace-nowrap">
            <span className="text-[#6D7A8A]">신청</span>{" "}
            {isMetricPending ? "--/--" : `${formatTwoDigits(program.applicationCount)}/00`}
          </p>
          <p className="whitespace-nowrap">
            <span className="text-[#6D7A8A]">조회</span>{" "}
            {isMetricPending ? "--" : formatTwoDigits(program.readiness)}
          </p>
          <p className="whitespace-nowrap">
            <span className="text-[#6D7A8A]">저장</span> {isMetricPending ? "--" : "00"}
          </p>
          <span
            className={`ml-auto inline-flex shrink-0 items-center rounded-[6px] px-[0.417vw] py-[0.208vw] text-[12px] font-semibold leading-[1.253] ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>
    </>
  );

  if (selectable) {
    return (
      <button className={cardClassName} onClick={onToggleSelect} type="button">
        {cardBody}
      </button>
    );
  }

  return (
    <Link className={cardClassName} href={href}>
      {cardBody}
    </Link>
  );
}

function getInsideFolderStatusMeta(status: ProgramStatus): {
  className: string;
  label: string;
} {
  if (status === "closed" || status === "earlyClosed") {
    return { className: "bg-[#C75C36] text-[#FCFCFC]", label: "마감" };
  }

  if (status === "upcoming") {
    return { className: "bg-[#6D7A8A] text-[#F3F3F3]", label: "예정" };
  }

  return { className: "bg-[#F7B267] text-[#FCFCFC]", label: "오픈" };
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function resolveReportProject(
  projectId: string,
  reportProjects: ReportProject[],
  fallback?: ReportProject,
): ReportProject | null {
  return reportProjects.find((project) => project.id === projectId) ?? fallback ?? null;
}

function buildNewProgramDraft(
  title: string,
  project: ReportProject,
): HostProgramDraft {
  const now = new Date().toISOString();
  const baseDraft = createHostProgramDraft();

  return {
    ...baseDraft,
    id: `draft-${Date.now()}`,
    villageId: project.villageId ?? "",
    title,
    region: project.villageName ?? "",
    city: "",
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
    sourceName: project.agencyName ?? "",
    sourceUrl: project.villageSlug ? `https://nuvio.kr/${project.villageSlug}` : "",
    applyUrl: "",
    phone: "",
    hashtags: [],
    image: project.imageUrl || "",
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
