"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Database,
  Eye,
  FilePlus2,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptyField,
  createEmptyTemplate,
  mergeApplicationFormTemplates,
  readApplicationFormTemplates,
  writeApplicationFormTemplates,
} from "@/lib/application-form-builder";
import { hostProgramPath, hostProjectPath } from "@/lib/host-projects";
import type {
  ApplicationFieldType,
  ApplicationFormField,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";

const fieldTypeLabels: Record<ApplicationFieldType, string> = {
  text: "짧은 답변",
  textarea: "긴 답변",
  select: "선택형",
  checkbox: "동의 체크",
};

export function HostFormBuilder({
  programId,
  programTitle,
  projectId,
}: {
  programId?: string;
  programTitle?: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(
    readApplicationFormTemplates,
  );
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates],
  );
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && programId ? hostProgramPath(projectId, programId) : undefined;

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseTemplates() {
      try {
        const response = await fetch("/api/host/forms", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data) ? payload.data : [];
        if (!isMounted || databaseTemplates.length === 0) return;

        setTemplates((currentTemplates) => {
          const nextTemplates = mergeApplicationFormTemplates(
            databaseTemplates,
            currentTemplates,
          );
          writeApplicationFormTemplates(nextTemplates);
          return nextTemplates;
        });
        setSelectedId((currentId) => currentId ?? databaseTemplates[0]?.id);
      } catch {
        if (isMounted) {
          setSyncError("DB 신청서를 불러오지 못했습니다.");
        }
      }
    }

    loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveTemplates(nextTemplates: ApplicationFormTemplate[]) {
    setTemplates(nextTemplates);
    writeApplicationFormTemplates(nextTemplates);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateTemplate(patch: Partial<ApplicationFormTemplate>) {
    if (!selectedTemplate) return;
    setSyncMessage("");
    setSyncError("");
    const nextTemplates = templates.map((template) =>
      template.id === selectedTemplate.id
        ? { ...template, ...patch, updatedAt: new Date().toISOString() }
        : template,
    );
    saveTemplates(nextTemplates);
  }

  function updateField(fieldId: string, patch: Partial<ApplicationFormField>) {
    if (!selectedTemplate) return;
    updateTemplate({
      fields: selectedTemplate.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });
  }

  function addTemplate() {
    const nextTemplate = createEmptyTemplate();
    setSyncMessage("");
    setSyncError("");
    saveTemplates([nextTemplate, ...templates]);
    setSelectedId(nextTemplate.id);
  }

  async function syncSelectedTemplate() {
    if (!selectedTemplate) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedTemplate),
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "DB 저장에 실패했습니다.");
      }

      const nextTemplates = mergeApplicationFormTemplates(
        [payload.data],
        templates.filter(
          (template) =>
            template.id !== selectedTemplate.id &&
            template.id !== payload.data?.id,
        ),
      );

      saveTemplates(nextTemplates);
      setSelectedId(payload.data.id);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "DB 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function addField() {
    if (!selectedTemplate) return;
    updateTemplate({ fields: [...selectedTemplate.fields, createEmptyField()] });
  }

  function removeField(fieldId: string) {
    if (!selectedTemplate) return;
    updateTemplate({
      fields: selectedTemplate.fields.filter((field) => field.id !== fieldId),
    });
  }

  if (!selectedTemplate) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addTemplate}
          type="button"
        >
          <FilePlus2 size={17} />
          신청서 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={programBasePath ?? projectBasePath ?? "/host"}
        >
          <ArrowLeft size={16} />
          {programBasePath ? "프로그램 허브" : projectBasePath ? "프로젝트 허브" : "운영 콘솔"}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            onClick={addTemplate}
            type="button"
          >
            <Plus size={16} />
            새 신청서
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
            disabled={isSyncing}
            onClick={syncSelectedTemplate}
            type="button"
          >
            {isSyncing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Database size={16} />
            )}
            DB 저장
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <FilePlus2 size={18} />
          {programBasePath ? "프로그램 신청서" : projectBasePath ? "프로젝트 신청서" : "신청서 빌더"}
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
          <span className="block">
            {programTitle
              ? `${programTitle}의 질문을`
              : projectBasePath
                ? "이 프로젝트의 질문을"
                : "호스트가 질문을"}
          </span>
          <span className="block">직접 만듭니다.</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 [overflow-wrap:anywhere]">
          {programBasePath
            ? "전역 신청서 도구가 아니라 선택한 프로그램의 모집 흐름에 붙는 질문 세트로 다룹니다."
            : projectBasePath
            ? "전역 신청서 도구가 아니라 선택한 프로젝트의 모집 흐름에 붙는 질문 세트로 다룹니다."
            : "DB 연결 전에는 브라우저에 저장하고, 연결 후에는 신청서 테이블로 이전할 구조입니다."}
        </p>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">
          {templates.map((template) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                template.id === selectedTemplate.id
                  ? "border-[var(--primary)] bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              type="button"
            >
              <p className="break-words font-black text-slate-950">{template.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {template.fields.length}개 질문
              </p>
            </button>
          ))}
        </aside>

        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">신청서명</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateTemplate({ name: event.target.value })}
                  value={selectedTemplate.name}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">연결 프로그램</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) =>
                    updateTemplate({ programTitle: event.target.value })
                  }
                  value={selectedTemplate.programTitle}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">설명</span>
                <textarea
                  className="min-h-20 w-full min-w-0 rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
                  onChange={(event) =>
                    updateTemplate({ description: event.target.value })
                  }
                  value={selectedTemplate.description}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-slate-950">질문 구성</h2>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                onClick={addField}
                type="button"
              >
                <Plus size={16} />
                질문 추가
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {selectedTemplate.fields.map((field) => (
                <FieldEditor
                  field={field}
                  key={field.id}
                  onRemove={() => removeField(field.id)}
                  onUpdate={(patch) => updateField(field.id, patch)}
                />
              ))}
            </div>

            <div
              aria-live="polite"
              className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500"
            >
              {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
              {saved ? "저장됨" : "변경 시 자동 저장"}
              {syncMessage ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
                  {syncMessage}
                </span>
              ) : null}
              {syncError ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                  {syncError}
                </span>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 xl:sticky xl:top-24 xl:self-start">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Eye className="text-[var(--primary)]" size={18} />
              미리보기
            </h2>
            <p className="mt-1 break-words text-sm text-slate-500">{selectedTemplate.description}</p>
            <div className="mt-5 grid gap-4">
              {selectedTemplate.fields.map((field) => (
                <PreviewField field={field} key={field.id} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onUpdate,
  onRemove,
}: {
  field: ApplicationFormField;
  onUpdate: (patch: Partial<ApplicationFormField>) => void;
  onRemove: () => void;
}) {
  return (
    <article className="min-w-0 rounded-md border border-slate-200 bg-[var(--surface-muted)] p-3">
        <div className="flex items-start gap-2 sm:gap-3">
        <GripVertical className="mt-2 shrink-0 text-slate-400" size={18} />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
            <input
              className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
              onChange={(event) => onUpdate({ label: event.target.value })}
              value={field.label}
            />
            <select
              className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
              onChange={(event) =>
                onUpdate({ type: event.target.value as ApplicationFieldType })
              }
              value={field.type}
            >
              {Object.entries(fieldTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
            onChange={(event) => onUpdate({ helper: event.target.value })}
            placeholder="도움말"
            value={field.helper ?? ""}
          />
          {field.type === "select" ? (
            <input
              className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
              onChange={(event) =>
                onUpdate({
                  options: event.target.value
                    .split(",")
                    .map((option) => option.trim())
                    .filter(Boolean),
                })
              }
              placeholder="선택지, 쉼표로 구분"
              value={(field.options ?? []).join(", ")}
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input
              checked={field.required}
              onChange={(event) => onUpdate({ required: event.target.checked })}
              type="checkbox"
            />
            필수 질문
          </label>
        </div>
        <button
          aria-label="질문 삭제"
          className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 hover:text-rose-600"
          onClick={onRemove}
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function PreviewField({ field }: { field: ApplicationFormField }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="break-words text-sm font-black text-slate-700">
        {field.label}
        {field.required ? <span className="text-[var(--accent)]"> *</span> : null}
      </span>
      {field.helper ? <span className="break-words text-xs text-slate-500">{field.helper}</span> : null}
      {field.type === "textarea" ? (
        <textarea className="min-h-24 w-full min-w-0 rounded-md border border-slate-200 p-3" />
      ) : null}
      {field.type === "select" ? (
        <select className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3">
          {(field.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : null}
      {field.type === "checkbox" ? (
        <span className="inline-flex w-full min-w-0 items-center gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-600 [overflow-wrap:anywhere]">
          <input type="checkbox" />
          동의합니다
        </span>
      ) : null}
      {field.type === "text" ? (
        <input className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3" />
      ) : null}
    </label>
  );
}
