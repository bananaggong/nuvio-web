"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Database,
  Eye,
  FilePlus2,
  GitBranch,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  blocksToFields,
  cloneApplicationFormTemplate,
  createEmptyBlock,
  createEmptyTemplate,
  isQuestionBlock,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
  readApplicationFormTemplates,
  writeApplicationFormTemplates,
} from "@/lib/application-form-builder";
import { hostProgramPath, hostProjectPath } from "@/lib/host-projects";
import type {
  ApplicationFormBlock,
  ApplicationFormBlockType,
  ApplicationFormBranch,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";

const blockTypeLabels: Record<ApplicationFormBlockType, string> = {
  checkbox: "동의 체크",
  date: "날짜",
  description: "설명",
  divider: "구분선",
  email: "이메일",
  longText: "긴 답변",
  multiSelect: "복수 선택",
  pageBreak: "페이지 나누기",
  phone: "연락처",
  shortText: "짧은 답변",
  singleSelect: "단일 선택",
  title: "제목",
};

const blockPalette: ApplicationFormBlockType[] = [
  "title",
  "description",
  "divider",
  "shortText",
  "longText",
  "singleSelect",
  "multiSelect",
  "checkbox",
  "date",
  "email",
  "phone",
  "pageBreak",
];

export function HostFormBuilder({
  programId,
  programTitle,
  projectId,
}: {
  programId?: string;
  programTitle?: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(() =>
    readApplicationFormTemplates().map(normalizeApplicationFormTemplateShape),
  );
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates],
  );
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && programId ? hostProgramPath(projectId, programId) : undefined;
  const globalTemplates = templates.filter((template) => !template.programTitle);

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseTemplates() {
      try {
        const response = await fetch("/api/host/forms", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];
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
          setSyncError("DB 신청폼을 불러오지 못했습니다.");
        }
      }
    }

    void loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveTemplates(nextTemplates: ApplicationFormTemplate[]) {
    const normalizedTemplates = nextTemplates.map(normalizeApplicationFormTemplateShape);
    setTemplates(normalizedTemplates);
    writeApplicationFormTemplates(normalizedTemplates);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateTemplate(patch: Partial<ApplicationFormTemplate>) {
    if (!selectedTemplate) return;
    setSyncMessage("");
    setSyncError("");
    const nextTemplates = templates.map((template) => {
      if (template.id !== selectedTemplate.id) return template;
      return normalizeApplicationFormTemplateShape({
        ...template,
        ...patch,
        fields: patch.blocks ? blocksToFields(patch.blocks) : template.fields,
        updatedAt: new Date().toISOString(),
      });
    });
    saveTemplates(nextTemplates);
  }

  function updateBlock(blockId: string, patch: Partial<ApplicationFormBlock>) {
    if (!selectedTemplate) return;
    updateTemplate({
      blocks: selectedTemplate.blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
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

  function duplicateTemplate(template = selectedTemplate) {
    if (!template) return;
    const copiedTemplate = cloneApplicationFormTemplate(template, {
      name: `${template.name} 복사본`,
      programTitle: template.programTitle,
    });
    saveTemplates([copiedTemplate, ...templates]);
    setSelectedId(copiedTemplate.id);
  }

  function importGlobalTemplate(template: ApplicationFormTemplate) {
    const copiedTemplate = cloneApplicationFormTemplate(template, {
      name: `${programTitle || "프로그램"} 신청폼`,
      programTitle: programTitle || "",
    });
    saveTemplates([copiedTemplate, ...templates]);
    setSelectedId(copiedTemplate.id);
  }

  async function syncSelectedTemplate() {
    if (!selectedTemplate) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(selectedTemplate),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "DB 저장에 실패했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      const nextTemplates = mergeApplicationFormTemplates(
        [savedTemplate],
        templates.filter(
          (template) =>
            template.id !== selectedTemplate.id &&
            template.id !== savedTemplate.id,
        ),
      );

      saveTemplates(nextTemplates);
      setSelectedId(savedTemplate.id);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "DB 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function addBlock(type: ApplicationFormBlockType) {
    if (!selectedTemplate) return;
    updateTemplate({ blocks: [...selectedTemplate.blocks, createEmptyBlock(type)] });
  }

  function removeBlock(blockId: string) {
    if (!selectedTemplate) return;
    updateTemplate({
      blocks: selectedTemplate.blocks.filter((block) => block.id !== blockId),
    });
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    if (!selectedTemplate) return;
    const index = selectedTemplate.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedTemplate.blocks.length) {
      return;
    }
    const nextBlocks = [...selectedTemplate.blocks];
    const [movedBlock] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, movedBlock);
    updateTemplate({ blocks: nextBlocks });
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
          신청폼 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-4 py-8 md:px-8">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            onClick={() => duplicateTemplate()}
            type="button"
          >
            <Copy size={16} />
            복제
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
            onClick={addTemplate}
            type="button"
          >
            <Plus size={16} />
            새 신청폼
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
          {programBasePath ? "프로그램 신청폼" : projectBasePath ? "프로젝트 신청폼" : "신청폼 관리"}
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
          {programTitle
            ? `${programTitle}에 연결할 신청폼을 구성합니다.`
            : "호스트가 직접 신청폼을 만들고 재사용합니다."}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          제목, 설명, 질문, 페이지, 분기 블록을 조합합니다. 라이브러리 폼은
          프로그램에 연결할 때 복제되어 독립적으로 수정됩니다.
        </p>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="min-w-0 space-y-3">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              My Forms
            </p>
            <div className="mt-3 grid gap-2">
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
                  <p className="break-words font-black text-slate-950">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {template.blocks.length}개 블록 ·{" "}
                    {template.programTitle ? template.programTitle : "라이브러리"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {programBasePath ? (
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-black text-slate-950">
                라이브러리에서 가져오기
              </p>
              <div className="mt-3 grid gap-2">
                {globalTemplates.map((template) => (
                  <button
                    className="rounded-md border border-slate-200 p-3 text-left text-sm font-bold text-slate-700 hover:border-[var(--primary)] hover:bg-teal-50"
                    key={`import-${template.id}`}
                    onClick={() => importGlobalTemplate(template)}
                    type="button"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">신청폼명</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateTemplate({ name: event.target.value })}
                  value={selectedTemplate.name}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">
                    연결 프로그램
                  </span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateTemplate({ programTitle: event.target.value })
                    }
                    placeholder="비워두면 라이브러리 폼"
                    value={selectedTemplate.programTitle}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">설명</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateTemplate({ description: event.target.value })
                    }
                    value={selectedTemplate.description}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">블록 캔버스</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Tally처럼 필요한 블록을 아래에 추가합니다.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {blockPalette.map((type) => (
                <button
                  className="h-9 rounded-md border border-slate-200 px-2.5 text-xs font-black text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  key={type}
                  onClick={() => addBlock(type)}
                  type="button"
                >
                  + {blockTypeLabels[type]}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {selectedTemplate.blocks.map((block, index) => (
                <BlockEditor
                  block={block}
                  blocks={selectedTemplate.blocks}
                  canMoveDown={index < selectedTemplate.blocks.length - 1}
                  canMoveUp={index > 0}
                  key={block.id}
                  onMoveDown={() => moveBlock(block.id, 1)}
                  onMoveUp={() => moveBlock(block.id, -1)}
                  onRemove={() => removeBlock(block.id)}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
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
        </main>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Eye className="text-[var(--primary)]" size={18} />
              미리보기
            </h2>
            <p className="mt-1 break-words text-sm text-slate-500">
              {selectedTemplate.description}
            </p>
            <div className="mt-5 grid gap-4">
              {selectedTemplate.blocks.map((block) => (
                <PreviewBlock block={block} key={block.id} />
              ))}
            </div>
          </section>
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <GitBranch className="text-[var(--primary)]" size={18} />
              분기 요약
            </h2>
            <div className="mt-4 grid gap-2">
              {selectedTemplate.blocks.flatMap((block) =>
                (block.branches ?? []).map((branch) => (
                  <div
                    className="rounded-md bg-[var(--surface-muted)] p-3 text-xs font-bold text-slate-600"
                    key={`${block.id}-${branch.id}`}
                  >
                    {block.label} = {branch.value} →{" "}
                    {findBlockLabel(selectedTemplate.blocks, branch.targetBlockId)}
                  </div>
                )),
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  blocks,
  canMoveDown,
  canMoveUp,
  onMoveDown,
  onMoveUp,
  onRemove,
  onUpdate,
}: {
  block: ApplicationFormBlock;
  blocks: ApplicationFormBlock[];
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ApplicationFormBlock>) => void;
}) {
  const canBranch =
    block.type === "singleSelect" ||
    block.type === "multiSelect" ||
    block.type === "checkbox";

  function updateOptions(value: string) {
    onUpdate({
      options: value
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
    });
  }

  function addBranch() {
    const firstOption = block.options?.[0] ?? "true";
    const targetBlock = blocks.find((item) => item.id !== block.id);
    onUpdate({
      branches: [
        ...(block.branches ?? []),
        {
          id: `branch-${Date.now()}`,
          targetBlockId: targetBlock?.id ?? "",
          value: firstOption,
        },
      ],
    });
  }

  function updateBranch(branchId: string, patch: Partial<ApplicationFormBranch>) {
    onUpdate({
      branches: (block.branches ?? []).map((branch) =>
        branch.id === branchId ? { ...branch, ...patch } : branch,
      ),
    });
  }

  function removeBranch(branchId: string) {
    onUpdate({
      branches: (block.branches ?? []).filter((branch) => branch.id !== branchId),
    });
  }

  return (
    <article className="min-w-0 rounded-md border border-slate-200 bg-[var(--surface-muted)] p-3">
      <div className="flex items-start gap-2 sm:gap-3">
        <GripVertical className="mt-2 shrink-0 text-slate-400" size={18} />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_170px]">
            <input
              className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
              onChange={(event) => onUpdate({ label: event.target.value })}
              value={block.label}
            />
            <select
              className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
              onChange={(event) =>
                onUpdate({ type: event.target.value as ApplicationFormBlockType })
              }
              value={block.type}
            >
              {Object.entries(blockTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {block.type === "description" ? (
            <textarea
              className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[var(--primary)]"
              onChange={(event) => onUpdate({ body: event.target.value })}
              value={block.body ?? ""}
            />
          ) : null}

          {isQuestionBlock(block) ? (
            <>
              <input
                className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                onChange={(event) => onUpdate({ helper: event.target.value })}
                placeholder="도움말"
                value={block.helper ?? ""}
              />
              {(block.type === "singleSelect" || block.type === "multiSelect") ? (
                <input
                  className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateOptions(event.target.value)}
                  placeholder="선택지, 쉼표로 구분"
                  value={(block.options ?? []).join(", ")}
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  checked={block.required}
                  onChange={(event) => onUpdate({ required: event.target.checked })}
                  type="checkbox"
                />
                필수 질문
              </label>
            </>
          ) : null}

          {canBranch ? (
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <GitBranch size={15} />
                  분기
                </p>
                <button
                  className="h-8 rounded-md border border-slate-200 px-2 text-xs font-black text-slate-600"
                  onClick={addBranch}
                  type="button"
                >
                  추가
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {(block.branches ?? []).map((branch) => (
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_32px]" key={branch.id}>
                    <select
                      className="h-9 rounded-md border border-slate-200 px-2 text-xs font-bold"
                      onChange={(event) =>
                        updateBranch(branch.id, { value: event.target.value })
                      }
                      value={branch.value}
                    >
                      {(block.type === "checkbox" ? ["true", "false"] : block.options ?? []).map(
                        (option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                    <select
                      className="h-9 rounded-md border border-slate-200 px-2 text-xs font-bold"
                      onChange={(event) =>
                        updateBranch(branch.id, { targetBlockId: event.target.value })
                      }
                      value={branch.targetBlockId}
                    >
                      {blocks
                        .filter((item) => item.id !== block.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                    <button
                      aria-label="분기 삭제"
                      className="grid size-8 place-items-center rounded-md bg-slate-50 text-slate-500 hover:text-rose-600"
                      onClick={() => removeBranch(branch.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid gap-1">
          <button
            aria-label="위로 이동"
            className="grid size-8 place-items-center rounded-md bg-white text-slate-500 disabled:opacity-30"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            type="button"
          >
            <ArrowUp size={15} />
          </button>
          <button
            aria-label="아래로 이동"
            className="grid size-8 place-items-center rounded-md bg-white text-slate-500 disabled:opacity-30"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            type="button"
          >
            <ArrowDown size={15} />
          </button>
          <button
            aria-label="블록 삭제"
            className="grid size-8 place-items-center rounded-md bg-white text-slate-500 hover:text-rose-600"
            onClick={onRemove}
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function PreviewBlock({ block }: { block: ApplicationFormBlock }) {
  if (block.type === "title") {
    return <h3 className="text-xl font-black text-slate-950">{block.label}</h3>;
  }
  if (block.type === "description") {
    return (
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {block.body || block.label}
      </p>
    );
  }
  if (block.type === "divider") {
    return <hr className="border-slate-200" />;
  }
  if (block.type === "pageBreak") {
    return (
      <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
        다음 페이지: {block.label}
      </div>
    );
  }

  return (
    <label className="grid min-w-0 gap-2">
      <span className="break-words text-sm font-black text-slate-700">
        {block.label}
        {block.required ? <span className="text-[var(--accent)]"> *</span> : null}
      </span>
      {block.helper ? (
        <span className="break-words text-xs text-slate-500">{block.helper}</span>
      ) : null}
      {block.type === "longText" ? (
        <textarea className="min-h-24 w-full min-w-0 rounded-md border border-slate-200 p-3" />
      ) : null}
      {block.type === "singleSelect" || block.type === "multiSelect" ? (
        <select
          className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3"
          multiple={block.type === "multiSelect"}
        >
          {(block.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : null}
      {block.type === "checkbox" ? (
        <span className="inline-flex w-full min-w-0 items-center gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-600 [overflow-wrap:anywhere]">
          <input type="checkbox" />
          동의합니다
        </span>
      ) : null}
      {["shortText", "email", "phone", "date"].includes(block.type) ? (
        <input
          className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3"
          type={block.type === "date" ? "date" : block.type === "email" ? "email" : "text"}
        />
      ) : null}
    </label>
  );
}

function findBlockLabel(blocks: ApplicationFormBlock[], blockId: string): string {
  return blocks.find((block) => block.id === blockId)?.label ?? "대상 없음";
}
