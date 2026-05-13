"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  CheckSquare,
  CircleDot,
  Copy,
  Eye,
  FilePlus2,
  GitBranch,
  GripVertical,
  ImagePlus,
  ListChecks,
  Loader2,
  Mail,
  Minus,
  Phone,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  image: "이미지",
  email: "이메일",
  longText: "긴 답변",
  multiSelect: "복수 선택",
  pageBreak: "페이지 나누기",
  phone: "연락처",
  shortText: "짧은 답변",
  singleSelect: "단일 선택",
  title: "제목",
};

const blockPaletteItems: Array<{
  description: string;
  icon: LucideIcon;
  type: ApplicationFormBlockType;
}> = [
  { description: "큰 제목을 넣습니다.", icon: Type, type: "title" },
  { description: "안내 문구를 적습니다.", icon: AlignLeft, type: "description" },
  { description: "영역을 나눕니다.", icon: Minus, type: "divider" },
  { description: "안내 이미지를 넣습니다.", icon: ImagePlus, type: "image" },
  { description: "한 줄 답변을 받습니다.", icon: Type, type: "shortText" },
  { description: "긴 서술형 답변을 받습니다.", icon: AlignLeft, type: "longText" },
  { description: "하나의 선택지를 받습니다.", icon: CircleDot, type: "singleSelect" },
  { description: "여러 선택지를 받습니다.", icon: ListChecks, type: "multiSelect" },
  { description: "동의 여부를 받습니다.", icon: CheckSquare, type: "checkbox" },
  { description: "날짜를 받습니다.", icon: CalendarDays, type: "date" },
  { description: "이메일을 받습니다.", icon: Mail, type: "email" },
  { description: "연락처를 받습니다.", icon: Phone, type: "phone" },
  { description: "긴 폼을 다음 페이지로 나눕니다.", icon: FilePlus2, type: "pageBreak" },
];

export function HostFormBuilder({
  formId,
  programId,
  projectId,
}: {
  formId?: string;
  programId?: string;
  projectId?: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(() =>
    readApplicationFormTemplates().map(normalizeApplicationFormTemplateShape),
  );
  const [selectedId, setSelectedId] = useState(formId ?? templates[0]?.id);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates],
  );
  const activeBlock = useMemo(
    () =>
      selectedTemplate?.blocks.find((block) => block.id === activeBlockId) ??
      selectedTemplate?.blocks[0] ??
      null,
    [activeBlockId, selectedTemplate],
  );
  const settingsBlock = useMemo(
    () =>
      selectedTemplate?.blocks.find((block) => block.id === settingsBlockId) ??
      null,
    [selectedTemplate, settingsBlockId],
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
        setSelectedId(
          (currentId) => currentId ?? formId ?? databaseTemplates[0]?.id,
        );
      } catch {
        if (isMounted) {
          setSyncError("신청폼을 불러오지 못했습니다.");
        }
      }
    }

    void loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, [formId]);

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
    setActiveBlockId(null);
    setSettingsBlockId(null);
    setInsertAfterIndex(-1);
    if (!projectId && !programId) {
      router.push(`/host/forms/${encodeURIComponent(nextTemplate.id)}`);
    }
  }

  function duplicateTemplate(template = selectedTemplate) {
    if (!template) return;
    const copiedTemplate = cloneApplicationFormTemplate(template, {
      name: `${template.name} 복사본`,
      programTitle: template.programTitle,
    });
    saveTemplates([copiedTemplate, ...templates]);
    setSelectedId(copiedTemplate.id);
    setSettingsBlockId(null);
    if (!projectId && !programId) {
      router.push(`/host/forms/${encodeURIComponent(copiedTemplate.id)}`);
    }
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
        throw new Error(payload.error ?? "저장에 실패했습니다.");
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
      setSyncMessage("저장되었습니다.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }

  function insertBlock(type: ApplicationFormBlockType, afterIndex: number) {
    if (!selectedTemplate) return;
    const nextBlock = createEmptyBlock(type);
    const nextBlocks = [...selectedTemplate.blocks];
    nextBlocks.splice(afterIndex + 1, 0, nextBlock);
    updateTemplate({ blocks: nextBlocks });
    setActiveBlockId(nextBlock.id);
    setInsertAfterIndex(null);
    setShowPreview(false);
  }

  function removeBlock(blockId: string) {
    if (!selectedTemplate) return;
    const blockIndex = selectedTemplate.blocks.findIndex(
      (block) => block.id === blockId,
    );
    const nextBlocks = selectedTemplate.blocks.filter(
      (block) => block.id !== blockId,
    );
    updateTemplate({ blocks: nextBlocks });
    setActiveBlockId(
      nextBlocks[Math.max(0, blockIndex - 1)]?.id ?? nextBlocks[0]?.id ?? null,
    );
    if (settingsBlockId === blockId) {
      setSettingsBlockId(null);
    }
  }

  function duplicateBlock(blockId: string) {
    if (!selectedTemplate) return;
    const blockIndex = selectedTemplate.blocks.findIndex(
      (block) => block.id === blockId,
    );
    const originalBlock = selectedTemplate.blocks[blockIndex];
    if (!originalBlock) return;

    const copiedBlock: ApplicationFormBlock = {
      ...originalBlock,
      branches: [],
      id: createEmptyBlock(originalBlock.type).id,
      label: `${originalBlock.label} 복사본`,
    };
    const nextBlocks = [...selectedTemplate.blocks];
    nextBlocks.splice(blockIndex + 1, 0, copiedBlock);
    updateTemplate({ blocks: nextBlocks });
    setActiveBlockId(copiedBlock.id);
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
    <div className="mx-auto min-w-0 max-w-[1500px] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={programBasePath ?? projectBasePath ?? "/host/forms"}
        >
          <ArrowLeft size={16} />
          {programBasePath
            ? "프로그램 허브"
            : projectBasePath
              ? "프로젝트 허브"
              : "신청폼 목록"}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            onClick={() => setShowPreview(true)}
            type="button"
          >
            <Eye size={16} />
            미리보기
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            onClick={() => duplicateTemplate()}
            type="button"
          >
            <Copy size={16} />
            복제
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
              <Save size={16} />
            )}
            저장
          </button>
        </div>
      </div>

      <div className="grid min-w-0 justify-center">
        <main className="w-[min(920px,calc(100vw-32px))] min-w-0">
          <section className="min-h-[720px] rounded-md border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-10 md:py-9">
            <div className="mx-auto max-w-2xl">
              <input
                aria-label="신청폼명"
                className="w-full min-w-0 border-none bg-transparent text-3xl font-black leading-tight text-slate-950 outline-none placeholder:text-slate-300"
                onChange={(event) => updateTemplate({ name: event.target.value })}
                placeholder="신청폼 제목"
                value={selectedTemplate.name}
              />
              <textarea
                aria-label="신청폼 설명"
                className="mt-3 min-h-12 w-full resize-none border-none bg-transparent text-sm font-bold leading-7 text-slate-500 outline-none placeholder:text-slate-300"
                onChange={(event) =>
                  updateTemplate({ description: event.target.value })
                }
                placeholder="신청자에게 보여줄 간단한 안내를 적어주세요."
                value={selectedTemplate.description}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                  {selectedTemplate.programTitle || "라이브러리 폼"}
                </span>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                  {selectedTemplate.blocks.length}개 블록
                </span>
                <span className="inline-flex items-center gap-1">
                  {saved ? (
                    <Check className="text-[var(--primary)]" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saved ? "저장됨" : "자동 저장"}
                </span>
              </div>

              {syncMessage || syncError ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                  {syncMessage ? (
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-700">
                      {syncMessage}
                    </span>
                  ) : null}
                  {syncError ? (
                    <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                      {syncError}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-8">
                {selectedTemplate.blocks.length === 0 ? (
                  <EmptyCanvas
                    isOpen={insertAfterIndex === -1}
                    onAdd={(type) => insertBlock(type, -1)}
                    onToggle={() =>
                      setInsertAfterIndex(insertAfterIndex === -1 ? null : -1)
                    }
                  />
                ) : (
                  <>
                    <InsertButton
                      isOpen={insertAfterIndex === -1}
                      onAdd={(type) => insertBlock(type, -1)}
                      onToggle={() =>
                        setInsertAfterIndex(insertAfterIndex === -1 ? null : -1)
                      }
                    />
                    <div className="grid gap-1">
                      {selectedTemplate.blocks.map((block, index) => (
                        <div key={block.id}>
                          <CanvasBlock
                            block={block}
                            canMoveDown={index < selectedTemplate.blocks.length - 1}
                            canMoveUp={index > 0}
                            isActive={block.id === activeBlock?.id && !showPreview}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onMoveDown={() => moveBlock(block.id, 1)}
                            onMoveUp={() => moveBlock(block.id, -1)}
                            onOpenSettings={() => {
                              setActiveBlockId(block.id);
                              setSettingsBlockId(block.id);
                              setShowPreview(false);
                            }}
                            onRemove={() => removeBlock(block.id)}
                            onSelect={() => {
                              setActiveBlockId(block.id);
                              setShowPreview(false);
                            }}
                            onUpdate={(patch) => updateBlock(block.id, patch)}
                          />
                          <InsertButton
                            isOpen={insertAfterIndex === index}
                            onAdd={(type) => insertBlock(type, index)}
                            onToggle={() =>
                              setInsertAfterIndex(
                                insertAfterIndex === index ? null : index,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>

      </div>
      {settingsBlock ? (
        <Modal onClose={() => setSettingsBlockId(null)}>
          <SettingsPanel
            block={settingsBlock}
            blocks={selectedTemplate.blocks}
            onClose={() => setSettingsBlockId(null)}
            onUpdate={(patch) => updateBlock(settingsBlock.id, patch)}
          />
        </Modal>
      ) : null}
      {showPreview ? (
        <Modal onClose={() => setShowPreview(false)}>
          <PreviewPanel
            onClose={() => setShowPreview(false)}
            template={selectedTemplate}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-48px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyCanvas({
  isOpen,
  onAdd,
  onToggle,
}: {
  isOpen: boolean;
  onAdd: (type: ApplicationFormBlockType) => void;
  onToggle: () => void;
}) {
  return (
    <div className="relative grid min-h-[360px] place-items-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
      <button
        className="grid gap-3 text-center"
        onClick={onToggle}
        type="button"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200">
          <Plus size={22} />
        </span>
        <span className="text-lg font-black text-slate-950">
          첫 질문을 추가하세요
        </span>
        <span className="max-w-xs text-sm font-bold leading-6 text-slate-500">
          제목, 설명, 질문, 페이지 구분을 필요한 순서대로 쌓아 신청폼을 만듭니다.
        </span>
      </button>
      {isOpen ? <BlockInsertMenu onAdd={onAdd} onClose={onToggle} /> : null}
    </div>
  );
}

function InsertButton({
  isOpen,
  onAdd,
  onToggle,
}: {
  isOpen: boolean;
  onAdd: (type: ApplicationFormBlockType) => void;
  onToggle: () => void;
}) {
  return (
    <div className="group/insert relative py-2">
      <div className="absolute left-0 right-0 top-1/2 hidden border-t border-slate-100 group-hover/insert:block" />
      <button
        aria-label="블록 추가"
        className="relative z-10 mx-auto grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-70 shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] group-hover/insert:opacity-100"
        onClick={onToggle}
        type="button"
      >
        <Plus size={16} />
      </button>
      {isOpen ? <BlockInsertMenu onAdd={onAdd} onClose={onToggle} /> : null}
    </div>
  );
}

function BlockInsertMenu({
  onAdd,
  onClose,
}: {
  onAdd: (type: ApplicationFormBlockType) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = blockPaletteItems.filter((item) => {
    const label = blockTypeLabels[item.type].toLowerCase();
    return (
      !normalizedQuery ||
      label.includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-[min(520px,calc(100vw-32px))] overflow-hidden rounded-md border border-slate-200 bg-white text-left shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-50 px-3 text-slate-400">
            <Search size={16} />
            <input
              autoFocus
              className="h-full min-w-0 flex-1 border-none bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="질문, 입력 방식, 레이아웃 검색"
              value={query}
            />
          </label>
          <button
            aria-label="닫기"
            className="grid size-10 place-items-center rounded-md text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[460px] overflow-y-auto p-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="grid w-full grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md p-3 text-left hover:bg-slate-50"
                key={item.type}
                onClick={() => {
                  onAdd(item.type);
                  onClose();
                }}
                type="button"
              >
                <span className="grid size-10 place-items-center rounded-md bg-teal-50 text-[var(--primary)]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">
                    {blockTypeLabels[item.type]}
                  </span>
                  <span className="mt-0.5 block text-xs font-bold text-slate-500">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
          {filteredItems.length === 0 ? (
            <p className="p-4 text-center text-sm font-bold text-slate-400">
              찾는 블록이 없습니다.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CanvasBlock({
  block,
  canMoveDown,
  canMoveUp,
  isActive,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onOpenSettings,
  onRemove,
  onSelect,
  onUpdate,
}: {
  block: ApplicationFormBlock;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onOpenSettings: () => void;
  onRemove: () => void;
  onSelect: () => void;
  onUpdate: (patch: Partial<ApplicationFormBlock>) => void;
}) {
  return (
    <article
      className={`group/block relative rounded-md border p-4 transition ${
        isActive
          ? "border-[var(--primary)] bg-teal-50/60 shadow-sm"
          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <div className="absolute -left-10 top-3 hidden items-center gap-1 opacity-0 transition group-hover/block:flex group-hover/block:opacity-100 md:flex">
        <span className="grid size-8 place-items-center rounded-md text-slate-300">
          <GripVertical size={17} />
        </span>
      </div>
      <BlockInlineEditor block={block} onUpdate={onUpdate} />
      <div
        className={`absolute right-3 top-3 flex gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm transition ${
          isActive ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
        }`}
      >
        <button
          aria-label="블록 설정"
          className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-50"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
          type="button"
        >
          <SlidersHorizontal size={14} />
        </button>
        <button
          aria-label="위로 이동"
          className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp();
          }}
          type="button"
        >
          <ArrowUp size={14} />
        </button>
        <button
          aria-label="아래로 이동"
          className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown();
          }}
          type="button"
        >
          <ArrowDown size={14} />
        </button>
        <button
          aria-label="복제"
          className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-50"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
          type="button"
        >
          <Copy size={14} />
        </button>
        <button
          aria-label="삭제"
          className="grid size-7 place-items-center rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function BlockInlineEditor({
  block,
  onUpdate,
}: {
  block: ApplicationFormBlock;
  onUpdate: (patch: Partial<ApplicationFormBlock>) => void;
}) {
  if (block.type === "title") {
    return (
      <input
        className="w-full min-w-0 border-none bg-transparent pr-28 text-2xl font-black leading-tight text-slate-950 outline-none placeholder:text-slate-300"
        onChange={(event) => onUpdate({ label: event.target.value })}
        placeholder="제목을 입력하세요"
        value={block.label}
      />
    );
  }

  if (block.type === "description") {
    return (
      <textarea
        className="min-h-24 w-full resize-none border-none bg-transparent pr-28 text-sm font-bold leading-7 text-slate-600 outline-none placeholder:text-slate-300"
        onChange={(event) =>
          onUpdate({ body: event.target.value, label: event.target.value })
        }
        placeholder="설명 문구를 입력하세요"
        value={block.body || block.label}
      />
    );
  }

  if (block.type === "divider") {
    return (
      <div className="flex items-center gap-3 pr-28">
        <hr className="min-w-0 flex-1 border-slate-200" />
        <input
          className="w-32 border-none bg-transparent text-center text-xs font-black text-slate-400 outline-none"
          onChange={(event) => onUpdate({ label: event.target.value })}
          value={block.label}
        />
        <hr className="min-w-0 flex-1 border-slate-200" />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-3 pr-28">
        <input
          className="w-full min-w-0 border-none bg-transparent text-lg font-black text-slate-950 outline-none placeholder:text-slate-300"
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="이미지 설명"
          value={block.label}
        />
        <input
          className="h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
          onChange={(event) => onUpdate({ imageUrl: event.target.value })}
          placeholder="이미지 URL을 붙여넣으세요"
          value={block.imageUrl ?? ""}
        />
        <label className="grid gap-2 text-xs font-black text-slate-500">
          이미지 크기 {block.imageWidth ?? 100}%
          <input
            max={100}
            min={25}
            onChange={(event) =>
              onUpdate({ imageWidth: Number(event.target.value) })
            }
            step={5}
            type="range"
            value={block.imageWidth ?? 100}
          />
        </label>
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={block.imageAlt || block.label}
            className="rounded-md object-cover"
            src={block.imageUrl}
            style={{ width: `${block.imageWidth ?? 100}%` }}
          />
        ) : (
          <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
            이미지를 삽입할 공간
          </div>
        )}
      </div>
    );
  }

  if (block.type === "pageBreak") {
    return (
      <div className="rounded-md bg-slate-100 p-3 pr-28">
        <p className="text-xs font-black text-slate-500">다음 페이지</p>
        <input
          className="mt-1 w-full border-none bg-transparent text-sm font-black text-slate-800 outline-none"
          onChange={(event) => onUpdate({ label: event.target.value })}
          value={block.label}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-2 pr-28">
      <input
        className="w-full min-w-0 border-none bg-transparent text-lg font-black text-slate-950 outline-none placeholder:text-slate-300"
        onChange={(event) => onUpdate({ label: event.target.value })}
        placeholder="질문을 입력하세요"
        value={block.label}
      />
      <input
        className="w-full min-w-0 border-none bg-transparent text-sm font-bold text-slate-400 outline-none placeholder:text-slate-300"
        onChange={(event) => onUpdate({ helper: event.target.value })}
        placeholder="설명 또는 힌트 추가"
        value={block.helper ?? ""}
      />
      <QuestionPreview block={block} />
    </div>
  );
}

function QuestionPreview({ block }: { block: ApplicationFormBlock }) {
  if (block.type === "longText") {
    return <div className="mt-2 h-24 rounded-md border border-slate-200 bg-white" />;
  }
  if (block.type === "singleSelect" || block.type === "multiSelect") {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {(block.options ?? []).map((option) => (
          <span
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500"
            key={option}
          >
            {option}
          </span>
        ))}
      </div>
    );
  }
  if (block.type === "checkbox") {
    return (
      <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-500 ring-1 ring-slate-200">
        <input type="checkbox" />
        동의합니다
      </span>
    );
  }
  return <div className="mt-2 h-10 rounded-md border border-slate-200 bg-white" />;
}

function SettingsPanel({
  block,
  blocks,
  onClose,
  onUpdate,
}: {
  block: ApplicationFormBlock | null;
  blocks: ApplicationFormBlock[];
  onClose: () => void;
  onUpdate: (patch: Partial<ApplicationFormBlock>) => void;
}) {
  if (!block) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-950">블록 설정</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          캔버스에서 블록을 선택하면 필수 여부, 선택지, 분기 설정을 조정할 수 있습니다.
        </p>
      </section>
    );
  }

  const canBranch =
    block.type === "singleSelect" ||
    block.type === "multiSelect" ||
    block.type === "checkbox";

  function updateOptions(value: string) {
    onUpdate({
      options: value
        .split("\n")
        .map((option) => option.trim())
        .filter(Boolean),
    });
  }

  function changeType(type: ApplicationFormBlockType) {
    if (!block) return;
    const defaults = createEmptyBlock(type);
    onUpdate({
      body: type === "description" ? block.body || defaults.body : block.body,
      imageAlt: type === "image" ? block.imageAlt || defaults.imageAlt : "",
      imageUrl: type === "image" ? block.imageUrl || defaults.imageUrl : "",
      imageWidth:
        type === "image" ? block.imageWidth || defaults.imageWidth : undefined,
      options:
        type === "singleSelect" || type === "multiSelect"
          ? block.options?.length
            ? block.options
            : defaults.options
          : [],
      required: isQuestionBlock({ ...block, type }) ? block.required : false,
      type,
    });
  }

  function addBranch() {
    if (!block) return;
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
    if (!block) return;
    onUpdate({
      branches: (block.branches ?? []).map((branch) =>
        branch.id === branchId ? { ...branch, ...patch } : branch,
      ),
    });
  }

  function removeBranch(branchId: string) {
    if (!block) return;
    onUpdate({
      branches: (block.branches ?? []).filter((branch) => branch.id !== branchId),
    });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Selected Block
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            {blockTypeLabels[block.type]}
          </h2>
        </div>
        <button
          aria-label="닫기"
          className="grid size-10 place-items-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">블록 타입</span>
          <select
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
            onChange={(event) =>
              changeType(event.target.value as ApplicationFormBlockType)
            }
            value={block.type}
          >
            {Object.entries(blockTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {isQuestionBlock(block) ? (
          <label className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 text-sm font-black text-slate-700">
            필수 질문
            <input
              checked={block.required}
              onChange={(event) => onUpdate({ required: event.target.checked })}
              type="checkbox"
            />
          </label>
        ) : null}

        {block.type === "singleSelect" || block.type === "multiSelect" ? (
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">
              선택지
            </span>
            <textarea
              className="min-h-28 rounded-md border border-slate-200 p-3 text-sm font-bold leading-6 outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateOptions(event.target.value)}
              placeholder={"선택지 1\n선택지 2"}
              value={(block.options ?? []).join("\n")}
            />
          </label>
        ) : null}

        {block.type === "image" ? (
          <div className="grid gap-4 rounded-md border border-slate-200 p-3">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">
                이미지 URL
              </span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                onChange={(event) => onUpdate({ imageUrl: event.target.value })}
                placeholder="https://..."
                value={block.imageUrl ?? ""}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">
                대체 텍스트
              </span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                onChange={(event) => onUpdate({ imageAlt: event.target.value })}
                placeholder="이미지를 설명하는 문장"
                value={block.imageAlt ?? ""}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">
                이미지 크기 {block.imageWidth ?? 100}%
              </span>
              <input
                max={100}
                min={25}
                onChange={(event) =>
                  onUpdate({ imageWidth: Number(event.target.value) })
                }
                step={5}
                type="range"
                value={block.imageWidth ?? 100}
              />
            </label>
          </div>
        ) : null}

        {canBranch ? (
          <div className="rounded-md border border-slate-200 p-3">
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
                <div className="grid gap-2" key={branch.id}>
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
                  <div className="grid grid-cols-[1fr_34px] gap-2">
                    <select
                      className="h-9 rounded-md border border-slate-200 px-2 text-xs font-bold"
                      onChange={(event) =>
                        updateBranch(branch.id, {
                          targetBlockId: event.target.value,
                        })
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
                      className="grid size-9 place-items-center rounded-md bg-slate-50 text-slate-500 hover:text-rose-600"
                      onClick={() => removeBranch(branch.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(block.branches ?? []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] p-3 text-xs font-bold leading-5 text-slate-500">
                  선택값에 따라 뒤쪽 질문으로 이동시키고 싶을 때 추가합니다.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PreviewPanel({
  onClose,
  template,
}: {
  onClose: () => void;
  template: ApplicationFormTemplate;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
          <Eye className="text-[var(--primary)]" size={18} />
          미리보기
        </h2>
        <button
          aria-label="닫기"
          className="grid size-10 place-items-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </div>
      <p className="mt-1 break-words text-sm text-slate-500">
        {template.description}
      </p>
      <div className="mt-5 grid gap-4">
        {template.blocks.map((block) => (
          <PreviewBlock block={block} key={block.id} />
        ))}
        {template.blocks.length === 0 ? (
          <p className="rounded-md bg-[var(--surface-muted)] p-4 text-sm font-bold text-slate-500">
            아직 추가된 질문이 없습니다.
          </p>
        ) : null}
      </div>
    </section>
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
  if (block.type === "image") {
    if (!block.imageUrl) {
      return (
        <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
          이미지 없음
        </div>
      );
    }

    return (
      <figure
        className="mx-auto"
        style={{ width: `${block.imageWidth ?? 100}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={block.imageAlt || block.label}
          className="w-full rounded-md object-cover"
          src={block.imageUrl}
        />
        {block.label ? (
          <figcaption className="mt-2 text-center text-xs font-bold text-slate-500">
            {block.label}
          </figcaption>
        ) : null}
      </figure>
    );
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
