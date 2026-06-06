"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import {
  createHostProgramDraft,
  mergeHostProgramDrafts,
} from "@/lib/host-program-studio";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  mergeReportProjects,
  type ReportProject,
} from "@/lib/report-automation";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProgramCreateWizard({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { applications, programs: hostPrograms, reportProjects, setPrograms, setReportProjects } =
    useHostOperationsData();

  const project = useMemo(
    () =>
      projectId
        ? findHostProjectOverview(projectId, applications, reportProjects, hostPrograms)
        : undefined,
    [applications, hostPrograms, projectId, reportProjects],
  );
  const projectPath = projectId ? hostProjectPath(projectId) : "/host/programs";
  const trimmedTitle = title.trim();
  const canCreate = Boolean(trimmedTitle) && !isSaving && (!projectId || Boolean(project));

  async function createProgram() {
    if (!canCreate) return;

    const sourceProject =
      project?.reportProject ??
      (projectId ? reportProjects.find((item) => item.id === projectId) : undefined);
    const programDraft = buildMinimalProgramDraft(trimmedTitle, sourceProject);

    setIsSaving(true);
    setErrorMessage("");

    try {
      const programResponse = await fetch("/api/host/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programDraft),
      });
      const programPayload = (await programResponse.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!programResponse.ok || !programPayload.data) {
        throw new Error(programPayload.error ?? "프로그램 생성에 실패했습니다.");
      }

      const savedProgram = programPayload.data;
      setPrograms((current) => mergeHostProgramDrafts([savedProgram], current));

      if (sourceProject && projectId) {
        const nextProject = {
          ...sourceProject,
          programId: sourceProject.programId || savedProgram.id,
          connectedProgramIds: Array.from(
            new Set([...sourceProject.connectedProgramIds, savedProgram.id]),
          ),
          connectedProgramTitles: Array.from(
            new Set([...sourceProject.connectedProgramTitles, savedProgram.title]),
          ),
          updatedAt: new Date().toISOString(),
        } satisfies ReportProject;

        const response = await fetch("/api/host/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextProject),
        });
        const payload = (await response.json()) as {
          data?: ReportProject;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "폴더에 프로그램을 연결하지 못했습니다.");
        }

        setReportProjects((current) =>
          mergeReportProjects([payload.data as ReportProject], current),
        );
      }

      router.push(
        projectId
          ? `${hostProgramPath(projectId, savedProgram.id)}?panel=dashboard&created=1`
          : `${hostStandaloneProgramPath(savedProgram.id)}?panel=dashboard&created=1`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "프로그램 생성에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (projectId && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href="/host/programs"
        >
          <ArrowLeft size={16} />
          프로그램 목록
        </Link>
        <div className="mt-5 rounded-md border border-[#F3E2D5] bg-white p-6">
          <h1 className="text-2xl font-black text-[#0D0D0C]">
            폴더를 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-5">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          {projectId ? "폴더" : "프로그램 목록"}
        </Link>
      </div>

      <section className="rounded-md border border-[#F3E2D5] bg-white p-5 sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
          <ClipboardList size={18} />
          새 프로그램
        </p>
        <h1 className="mt-4 text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
          프로그램 이름만 정하고 바로 시작합니다.
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-[#8B7A6E]">
          상세 소개, 장소, 일정, 신청폼, 안내 메시지는 생성 후 열리는 프로그램
          제작 화면에서 차근차근 채우면 됩니다.
        </p>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void createProgram();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#5B3A29]">
              프로그램 이름
            </span>
            <input
              autoFocus
              className="h-12 rounded-md border border-[#E6D6CA] bg-white px-3 text-base font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 나를 담는 차 실험실"
              value={title}
            />
          </label>

          {errorMessage ? (
            <p className="text-sm font-bold text-red-600">{errorMessage}</p>
          ) : null}

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40 sm:w-fit"
            disabled={!canCreate}
            type="submit"
          >
            <Plus size={16} />
            {isSaving ? "생성 중" : "프로그램 만들기"}
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}

function buildMinimalProgramDraft(
  title: string,
  project?: ReportProject,
): HostProgramDraft {
  const now = new Date().toISOString();
  const baseDraft = createHostProgramDraft();

  return {
    ...baseDraft,
    id: `draft-${Date.now()}`,
    villageId: project?.villageId ?? "",
    title,
    region: project?.villageName ?? "",
    city: "",
    summary: "",
    description: "",
    recruitStart: baseDraft.recruitStart,
    recruitEnd: baseDraft.recruitEnd,
    activityStart: baseDraft.activityStart,
    activityEnd: baseDraft.activityEnd,
    target: "",
    capacity: "",
    subsidyLabel: "",
    subsidyAmount: 0,
    fee: "",
    sourceName: project?.agencyName ?? "",
    sourceUrl: project?.villageSlug ? `https://nuvio.kr/${project.villageSlug}` : "",
    applyUrl: "",
    phone: "",
    hashtags: [],
    image: project?.imageUrl ?? "/brand/nuvio-logo-combined.svg",
    published: false,
    status: "upcoming",
    updatedAt: now,
  };
}
