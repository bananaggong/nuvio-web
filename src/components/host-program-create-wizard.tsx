"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  cloneApplicationFormTemplate,
  readApplicationFormTemplates,
  writeApplicationFormTemplates,
} from "@/lib/application-form-builder";
import {
  findHostProjectOverview,
  hostProgramId,
  hostProgramPath,
  hostProjectPath,
} from "@/lib/host-projects";
import {
  readHostApplicationsFromStorage,
} from "@/lib/host-operations";
import {
  mergeReportProjects,
  readReportProjects,
  writeReportProjects,
} from "@/lib/report-automation";

const steps = ["프로그램 개요", "상세 페이지", "신청 폼", "안내문자"] as const;

export function HostProgramCreateWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [capacity, setCapacity] = useState("");
  const [period, setPeriod] = useState("");
  const [formName, setFormName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [messageName, setMessageName] = useState("");
  const applications = readHostApplicationsFromStorage();
  const reportProjects = readReportProjects();
  const formTemplates = readApplicationFormTemplates();
  const reusableFormTemplates = formTemplates.filter(
    (template) => !template.programTitle,
  );
  const project = findHostProjectOverview(projectId, applications, reportProjects);
  const projectPath = hostProjectPath(projectId);
  const canFinish = Boolean(title.trim());
  const previewItems = useMemo(
    () => [
      ["프로그램명", title || "미입력"],
      ["썸네일", thumbnailUrl || "기본 이미지 사용"],
      ["운영/모집 기간", period || "미입력"],
      ["모집 인원", capacity || "미입력"],
      ["신청 폼", formName || `${title || "프로그램"} 기본 신청서`],
      ["안내문자", messageName || "신청 완료 안내"],
    ],
    [capacity, formName, messageName, period, thumbnailUrl, title],
  );

  function finish() {
    if (!canFinish) return;

    const programTitle = title.trim();
    const selectedFormTemplate = formTemplates.find(
      (template) => template.id === selectedFormId,
    );
    const nextProjects = reportProjects.map((item) => {
      if (item.id !== projectId) return item;
      const connectedProgramTitles = Array.from(
        new Set([...item.connectedProgramTitles, programTitle]),
      );

      return {
        ...item,
        connectedProgramTitles,
        updatedAt: new Date().toISOString(),
      };
    });

    writeReportProjects(
      mergeReportProjects(nextProjects, reportProjects.length ? [] : []),
    );

    if (selectedFormTemplate) {
      const programFormTemplate = cloneApplicationFormTemplate(selectedFormTemplate, {
        name: formName.trim() || `${programTitle} 신청폼`,
        programTitle,
      });
      writeApplicationFormTemplates([programFormTemplate, ...formTemplates]);
    }

    router.push(hostProgramPath(projectId, hostProgramId(programTitle)));
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          프로젝트 목록
        </Link>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black text-slate-950">
            프로젝트를 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          프로젝트 허브
        </Link>
      </div>


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
              label="프로그램명"
              onChange={setTitle}
              placeholder="예: 나를 담는 차 실험실"
              value={title}
            />
            <TextInput
              label="썸네일 이미지 URL"
              onChange={setThumbnailUrl}
              placeholder="/boseong/home-tea-time.png"
              value={thumbnailUrl}
            />
            <TextInput
              label="운영/모집 기간"
              onChange={setPeriod}
              placeholder="예: 2026.06.01 - 2026.06.30"
              value={period}
            />
            <TextInput
              label="모집 인원"
              onChange={setCapacity}
              placeholder="예: 12명"
              value={capacity}
            />
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-black text-slate-700">요약</span>
              <textarea
                className="min-h-24 rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[var(--primary)]"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="프로그램 카드와 상세 상단에 사용할 짧은 소개"
                value={summary}
              />
            </label>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <ProgramStep
            body="모집 포스터, 상세 이미지, 일정표, 장소/숙소/준비물, 유의사항을 이 단계에서 붙입니다. 현재는 구조를 잡는 단계라 다음 화면에서 공개 페이지 편집기로 확장할 수 있게 둡니다."
            title="상세 페이지 구성"
          />
        ) : null}

        {stepIndex === 2 ? (
          <div className="grid gap-4">
            <TextInput
              label="신청폼 이름"
              onChange={setFormName}
              placeholder={`${title || "프로그램"} 신청폼`}
              value={formName}
            />
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">
                라이브러리 신청폼
              </span>
              <select
                className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                onChange={(event) => {
                  const nextFormId = event.target.value;
                  const nextTemplate = formTemplates.find(
                    (template) => template.id === nextFormId,
                  );
                  setSelectedFormId(nextFormId);
                  if (nextTemplate && !formName.trim()) {
                    setFormName(`${title || "프로그램"} 신청폼`);
                  }
                }}
                value={selectedFormId}
              >
                <option value="">새 기본 신청폼으로 시작</option>
                {reusableFormTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <ProgramStep
              body="미리 만든 신청폼을 선택하면 완료 시 이 프로그램 전용 복사본이 생성됩니다. 이후 프로그램 내부 신청폼 화면에서 독립적으로 수정할 수 있습니다."
              title="신청폼 연결"
            />
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="grid gap-4">
            <TextInput
              label="안내 캠페인 이름"
              onChange={setMessageName}
              placeholder="신청 완료 안내"
              value={messageName}
            />
            <div className="rounded-md bg-[var(--surface-muted)] p-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <MessageSquareText className="text-[var(--primary)]" size={20} />
                생성 전 확인
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {previewItems.map(([label, value]) => (
                  <div className="rounded-md bg-white p-3" key={label}>
                    <p className="text-xs font-black text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
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
            onClick={() =>
              stepIndex === steps.length - 1
                ? finish()
                : setStepIndex((current) => current + 1)
            }
            type="button"
          >
            {stepIndex === steps.length - 1 ? (
              <>
                <CheckCircle2 size={16} />
                완료
              </>
            ) : (
              <>
                다음
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProgramStep({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
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
