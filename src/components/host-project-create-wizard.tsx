"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createReportProject,
  readReportProjects,
  reportStatusLabels,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject, ReportProjectStatus } from "@/lib/report-automation";
import { hostProjectPath } from "@/lib/host-projects";

const steps = ["개요", "운영 기준", "확인"] as const;

export function HostProjectCreateWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ReportProject>(() => ({
    ...createReportProject(),
    title: "",
    villageName: "",
    agencyName: "",
    ownerName: "",
    periodLabel: "",
  }));
  const canFinish = Boolean(
    draft.title.trim() &&
      draft.villageName.trim() &&
      draft.agencyName.trim() &&
      draft.periodLabel.trim(),
  );
  const nextLabel = stepIndex === steps.length - 1 ? "프로젝트 만들기" : "다음";
  const previewItems = useMemo(
    () => [
      ["프로젝트명", draft.title || "미입력"],
      ["로컬홈", draft.villageName || "미입력"],
      ["운영 조직", draft.agencyName || "미입력"],
      ["운영 기간", draft.periodLabel || "미입력"],
      ["상태", reportStatusLabels[draft.status]],
    ],
    [draft],
  );

  function updateDraft(patch: Partial<ReportProject>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    if (!canFinish) return;
    const now = new Date().toISOString();
    const nextProject: ReportProject = {
      ...draft,
      title: draft.title.trim(),
      villageName: draft.villageName.trim(),
      agencyName: draft.agencyName.trim(),
      ownerName: draft.ownerName.trim() || "운영 담당자",
      periodLabel: draft.periodLabel.trim(),
      updatedAt: now,
    };
    writeReportProjects([nextProject, ...readReportProjects()]);
    router.push(hostProjectPath(nextProject.id));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          운영 콘솔
        </Link>
      </div>

      <section className="rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <FolderKanban size={18} />
          New Operation Project
        </p>
        <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
          운영 프로젝트를 먼저 만들고, 그 안에 프로그램을 신설합니다.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          프로젝트는 예산, 증빙, 활동, 보고를 묶는 상위 단위입니다. 공개 모집
          프로그램은 다음 단계에서 이 프로젝트 하위로 추가합니다.
        </p>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <button
            className={`h-10 rounded-md border px-4 text-sm font-black ${
              stepIndex === index
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
            key={step}
            onClick={() => setStepIndex(index)}
            type="button"
          >
            {index + 1}. {step}
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-md border border-slate-200 bg-white p-5">
        {stepIndex === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="프로젝트명"
              onChange={(value) => updateDraft({ title: value })}
              placeholder="예: 보성 로컬홈 2026 운영 프로젝트"
              value={draft.title}
            />
            <TextInput
              label="로컬홈명"
              onChange={(value) => updateDraft({ villageName: value })}
              placeholder="예: 전체차LAB"
              value={draft.villageName}
            />
            <TextInput
              label="운영 조직"
              onChange={(value) => updateDraft({ agencyName: value })}
              placeholder="예: 보성 로컬홈 운영팀"
              value={draft.agencyName}
            />
            <TextInput
              label="담당자"
              onChange={(value) => updateDraft({ ownerName: value })}
              placeholder="예: 운영 담당자"
              value={draft.ownerName}
            />
            <TextInput
              label="운영 기간"
              onChange={(value) => updateDraft({ periodLabel: value })}
              placeholder="예: 2026.05.01 - 2026.11.30"
              value={draft.periodLabel}
            />
            <TextInput
              label="대표 이미지 URL"
              onChange={(value) => updateDraft({ imageUrl: value })}
              placeholder="/boseong/hero-illustration.png"
              value={draft.imageUrl ?? ""}
            />
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">진행 상태</span>
              <select
                className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                onChange={(event) =>
                  updateDraft({
                    status: event.target.value as ReportProjectStatus,
                  })
                }
                value={draft.status}
              >
                {Object.entries(reportStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="초기 연결 프로그램"
              onChange={(value) =>
                updateDraft({
                  connectedProgramTitles: value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              placeholder="쉼표로 구분, 비워두면 이후에 추가"
              value={draft.connectedProgramTitles.join(", ")}
            />
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <CheckCircle2 className="text-[var(--primary)]" size={22} />
              생성 전 확인
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {previewItems.map(([label, value]) => (
                <div className="rounded-md bg-[var(--surface-muted)] p-4" key={label}>
                  <p className="text-xs font-black text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 disabled:opacity-40"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            type="button"
          >
            이전
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:opacity-40"
            disabled={stepIndex === steps.length - 1 && !canFinish}
            onClick={next}
            type="button"
          >
            {stepIndex === steps.length - 1 ? <Plus size={16} /> : null}
            {nextLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
