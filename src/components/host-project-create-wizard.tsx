"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FolderKanban,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
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
      agencyName: "운영 조직명",
      connectedProgramTitles: [],
      ownerName: "운영 담당자",
      periodLabel: "운영 기간 미정",
      title: trimmedName,
      updatedAt: now,
      villageName: "로컬페이지",
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
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          모든 폴더
        </Link>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <FolderKanban size={18} />
          새 폴더
        </p>
        <h1 className="mt-4 max-w-2xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
          폴더는 프로그램을 담는 상위 공간입니다.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          지금은 이름만 정하면 됩니다. 모집 상세, 신청서, 안내문자 같은 여러
          필드는 폴더 안에서 프로그램을 신설할 때 입력합니다.
        </p>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">
              폴더 이름
            </span>
            <input
              autoFocus
              className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold outline-none focus:border-[var(--primary)]"
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createProject();
              }}
              placeholder="예: 보성 로컬페이지 2026 운영"
              value={projectName}
            />
          </label>

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-fit"
            disabled={!canCreate}
            onClick={() => void createProject()}
            type="button"
          >
            <Plus size={16} />
            {isCreating ? "저장 중" : "만들고 들어가기"}
            <ArrowRight size={16} />
          </button>
          {errorMessage ? (
            <p className="text-sm font-bold text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <FlowCard
          body="연간 사업, 시즌, 지원사업, 계약처럼 큰 운영 단위를 먼저 엽니다."
          icon={<FolderKanban size={18} />}
          title="1. 폴더 생성"
        />
        <FlowCard
          body="폴더 안에서 공개 모집 프로그램을 만들고 상세 필드를 입력합니다."
          icon={<ClipboardList size={18} />}
          title="2. 프로그램 신설"
        />
        <FlowCard
          body="프로그램별 신청자, 신청서, 메시지를 관리하고 폴더 단위로 마감합니다."
          icon={<ArrowRight size={18} />}
          title="3. 운영 관리"
        />
      </div>
    </div>
  );
}

function FlowCard({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <span className="grid size-9 place-items-center rounded-md bg-teal-50 text-[var(--primary)]">
        {icon}
      </span>
      <h2 className="mt-4 text-base font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}
