"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import {
  createReportProject,
  type ReportProject,
} from "@/lib/report-automation";
import { hostProjectPath } from "@/lib/host-projects";

export function HostProjectCreateWizard() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const trimmedName = projectName.trim();
  const canCreate = Boolean(trimmedName) && !isCreating;

  async function createProject() {
    if (!canCreate) return;

    const now = new Date().toISOString();
    const nextProject: ReportProject = {
      ...createReportProject(),
      agencyName: "운영 조직",
      connectedProgramIds: [],
      connectedProgramTitles: [],
      ownerName: "운영 담당자",
      periodLabel: "기간 미정",
      programId: undefined,
      programTitle: "전체 프로그램",
      title: trimmedName,
      updatedAt: now,
      villageName: "채널",
    };

    setIsCreating(true);
    setErrorMessage("");

    try {
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
        throw new Error(payload.error ?? "폴더 저장에 실패했습니다.");
      }

      router.push(hostProjectPath(payload.data.id));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "폴더 저장에 실패했습니다.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href="/host/programs"
        >
          <ArrowLeft size={16} />
          프로그램 목록
        </Link>
      </div>

      <section className="rounded-md border border-[#F3E2D5] bg-white p-5 sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
          <FolderKanban size={18} />
          새 폴더
        </p>
        <h1 className="mt-4 max-w-2xl text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
          폴더는 프로그램을 모아두는 공간입니다.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7A6558]">
          지금은 이름만 정하면 됩니다. 프로그램은 폴더 없이도 만들 수 있고,
          필요할 때 이 폴더 안에 모아둘 수 있습니다.
        </p>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#5B3A29]">폴더 이름</span>
            <input
              autoFocus
              className="h-12 rounded-md border border-[#F3E2D5] px-3 text-base font-bold text-[#0D0D0C] outline-none focus:border-[#FE701E]"
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createProject();
              }}
              placeholder="예: 2026 봄 프로그램"
              value={projectName}
            />
          </label>

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40 sm:w-fit"
            disabled={!canCreate}
            onClick={() => void createProject()}
            type="button"
          >
            <Plus size={16} />
            {isCreating ? "저장 중" : "폴더 만들기"}
            <ArrowRight size={16} />
          </button>
          {errorMessage ? (
            <p className="text-sm font-bold text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
