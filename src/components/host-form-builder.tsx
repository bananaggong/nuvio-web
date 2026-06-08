"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  Copy,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  blocksToFields,
  createEmptyBlock,
  isQuestionBlock,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import type {
  ApplicationFormBlock,
  ApplicationFormBlockType,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  HostWorkspaceContent,
  HostWorkspaceLayout,
} from "@/components/host-workspace-ui";

type HostProgramOption = {
  id: string;
  slug?: string;
  title: string;
};

const editableBlockTypes: Array<{
  label: string;
  type: ApplicationFormBlockType;
}> = [
  { label: "텍스트", type: "shortText" },
  { label: "숫자", type: "phone" },
  { label: "선택박스", type: "singleSelect" },
  { label: "드롭다운", type: "multiSelect" },
  { label: "파일 요청", type: "image" },
  { label: "파일 첨부", type: "description" },
  { label: "동의 항목", type: "checkbox" },
];

export function HostFormBuilder({
  formId,
}: {
  formId?: string;
  programId?: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>([]);
  const [hostPrograms, setHostPrograms] = useState<HostProgramOption[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === formId) ??
      (!formId ? templates[0] : undefined),
    [formId, templates],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadForms() {
      try {
        const response = await fetch("/api/host/forms?kind=application", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];

        if (isMounted) {
          setTemplates((currentTemplates) =>
            mergeApplicationFormTemplates(databaseTemplates, currentTemplates),
          );
        }
      } catch {
        if (isMounted) setError("신청서 양식을 불러오지 못했습니다.");
      } finally {
        if (isMounted) setHasLoadedTemplates(true);
      }
    }

    void loadForms();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPrograms() {
      try {
        const response = await fetch("/api/host/programs", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: Array<Partial<HostProgramOption>>;
        };
        const programs = Array.isArray(payload.data)
          ? payload.data
              .map((item) => ({
                id: String(item.id ?? "").trim(),
                slug: item.slug?.trim() || undefined,
                title: String(item.title ?? "").trim(),
              }))
              .filter((item) => item.id && item.title)
          : [];

        if (isMounted) setHostPrograms(programs);
      } catch {
        if (isMounted) setError("연결할 프로그램 목록을 불러오지 못했습니다.");
      }
    }

    void loadPrograms();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateTemplate(patch: Partial<ApplicationFormTemplate>) {
    if (!selectedTemplate) return;
    setMessage("");
    setError("");

    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => {
        if (template.id !== selectedTemplate.id) return template;
        const blocks = patch.blocks ?? template.blocks;

        return normalizeApplicationFormTemplateShape({
          ...template,
          ...patch,
          blocks,
          fields: blocksToFields(blocks),
          updatedAt: new Date().toISOString(),
        });
      }),
    );
  }

  function updateBlock(blockId: string, patch: Partial<ApplicationFormBlock>) {
    if (!selectedTemplate) return;

    updateTemplate({
      blocks: selectedTemplate.blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    });
  }

  function addBlock() {
    if (!selectedTemplate) return;
    updateTemplate({
      blocks: [...selectedTemplate.blocks, createEmptyBlock("shortText")],
    });
  }

  function duplicateBlock(block: ApplicationFormBlock) {
    if (!selectedTemplate) return;
    const index = selectedTemplate.blocks.findIndex((item) => item.id === block.id);
    const copiedBlock = {
      ...block,
      id: createEmptyBlock(block.type).id,
      label: `${block.label} 복사본`,
    };
    const nextBlocks = [...selectedTemplate.blocks];
    nextBlocks.splice(index + 1, 0, copiedBlock);
    updateTemplate({ blocks: nextBlocks });
  }

  function removeBlock(blockId: string) {
    if (!selectedTemplate) return;
    updateTemplate({
      blocks: selectedTemplate.blocks.filter((block) => block.id !== blockId),
    });
  }

  async function saveTemplate() {
    if (!selectedTemplate || isSaving) return;
    setIsSaving(true);
    setMessage("");
    setError("");

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
        throw new Error(payload.error ?? "저장하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          [savedTemplate],
          currentTemplates.filter((template) => template.id !== selectedTemplate.id),
        ),
      );
      setMessage("저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!selectedTemplate) {
    return (
      <HostWorkspaceLayout>
        <HostWorkspaceContent insideFolder>
          <div className="pt-[var(--host-24)]">
            <div className="rounded-[8px] border border-dashed border-[#6D7A8A] px-[var(--host-18)] py-[var(--host-40)] text-center">
              <p className="text-[var(--host-14)] font-medium leading-[1.6] text-[#6D7A8A]">
                {hasLoadedTemplates
                  ? "신청서 양식을 찾을 수 없습니다."
                  : "신청서 양식을 불러오는 중입니다."}
              </p>
              <Link
                className="mt-[var(--host-16)] inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6D7A8A] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC]"
                href="/host/forms"
              >
                목록으로
              </Link>
            </div>
          </div>
        </HostWorkspaceContent>
      </HostWorkspaceLayout>
    );
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[calc(var(--host-scale)*1864px)]">
      <HostWorkspaceContent insideFolder>
        <div className="grid grid-cols-[calc(var(--host-scale)*586px)_minmax(0,1fr)] gap-[calc(var(--host-scale)*28px)] max-xl:grid-cols-1">
          <section className="min-h-[calc(var(--host-scale)*1864px)] border-r border-[#6D7A8A] pr-[calc(var(--host-scale)*30px)] max-xl:min-h-0 max-xl:border-r-0 max-xl:pr-0">
            <div className="flex flex-col gap-[calc(var(--host-scale)*46px)] pb-[var(--host-24)]">
              <div className="pt-[var(--host-24)]">
                <div className="flex h-[var(--host-29)] items-center gap-[14px]">
                  <Link
                    aria-label="목록으로"
                    className="inline-flex h-[18px] w-[12px] items-center justify-center text-[#6D7A8A] hover:text-[#FE701E]"
                    href="/host/forms"
                  >
                    <ChevronLeft size={20} strokeWidth={1.8} />
                  </Link>
                  <h1 className="whitespace-nowrap text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                    신청서 양식 편집
                  </h1>
                  <button
                    className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#FE701E] px-[var(--host-12)] py-[var(--host-4)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void saveTemplate()}
                    type="button"
                  >
                    {isSaving ? "저장중" : "저장하기"}
                  </button>
                </div>
              </div>

              <section className="flex w-[calc(var(--host-scale)*511px)] max-w-full flex-col gap-[calc(var(--host-scale)*33px)] rounded-[8px] border border-[#6D7A8A] p-[var(--host-18)]">
                <EditorField label="신청서 제목">
                  <input
                    className="host-form-input"
                    onChange={(event) => updateTemplate({ name: event.target.value })}
                    placeholder="신청서의 제목을 입력해 주세요."
                    value={selectedTemplate.name}
                  />
                </EditorField>
                <EditorField label="안내 사항">
                  <input
                    className="host-form-input"
                    onChange={(event) =>
                      updateTemplate({ description: event.target.value })
                    }
                    placeholder="게스트에게 전달할 안내사항을 입력해주세요. (예: 신청 전 유의사항, 준비물 안내 등)"
                    value={selectedTemplate.description}
                  />
                </EditorField>
                <EditorField label="프로그램 연결">
                  <label className="relative block">
                    <select
                      className="host-form-input appearance-none pr-[var(--host-34)]"
                      onChange={(event) => {
                        const program = hostPrograms.find(
                          (item) => item.id === event.target.value,
                        );
                        updateTemplate({
                          programId: program?.id ?? "",
                          programTitle: program?.title ?? "",
                        });
                      }}
                      value={selectedTemplate.programId || ""}
                    >
                      <option value="">연결할 프로그램을 선택해 주세요.</option>
                      {hostPrograms.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-[var(--host-12)] top-1/2 -translate-y-1/2 text-[#FF9A3D]"
                      size={20}
                    />
                  </label>
                </EditorField>
              </section>

              <section className="flex w-[calc(var(--host-scale)*511px)] max-w-full flex-col gap-[var(--host-14)] px-[var(--host-18)] pb-[var(--host-18)]">
                <h2 className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
                  항목 추가
                </h2>
                <div className="flex flex-col gap-[calc(var(--host-scale)*28px)]">
                  {selectedTemplate.blocks.map((block) => (
                    <EditableBlockCard
                      block={block}
                      key={block.id}
                      onDuplicate={() => duplicateBlock(block)}
                      onRemove={() => removeBlock(block.id)}
                      onUpdate={(patch) => updateBlock(block.id, patch)}
                    />
                  ))}
                </div>
                <button
                  className="flex w-full flex-col items-center justify-center gap-[var(--host-8)] py-[var(--host-16)]"
                  onClick={addBlock}
                  type="button"
                >
                  <span className="text-center text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
                    아래의 버튼을 눌러 항목을 추가해 주세요.
                  </span>
                  <span className="grid size-[calc(var(--host-scale)*28px)] place-items-center rounded-full bg-[#FF9A3D] text-white">
                    <Plus size={18} strokeWidth={2.3} />
                  </span>
                </button>
              </section>

              {message || error ? (
                <div className="px-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.6]">
                  {message ? <p className="text-[#6D7A8A]">{message}</p> : null}
                  {error ? <p className="text-[#FE701E]">{error}</p> : null}
                </div>
              ) : null}
            </div>
          </section>

          <FormPreview template={selectedTemplate} />
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function EditorField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex w-full flex-col gap-[var(--host-10)]">
      <span className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      {children}
    </label>
  );
}

function EditableBlockCard({
  block,
  onDuplicate,
  onRemove,
  onUpdate,
}: {
  block: ApplicationFormBlock;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ApplicationFormBlock>) => void;
}) {
  const options = block.options ?? [];

  return (
    <article className="flex w-full flex-col gap-[var(--host-6)] border-b border-[#F3F3F3] py-[var(--host-16)]">
      <div className="flex items-center gap-[var(--host-10)] px-[var(--host-12)]">
        <select
          className="h-[calc(var(--host-scale)*24px)] rounded-[19px] bg-[#6D7A8A] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] outline-none"
          onChange={(event) =>
            onUpdate({
              options:
                event.target.value === "singleSelect" ||
                event.target.value === "multiSelect"
                  ? options.length > 0
                    ? options
                    : ["선택지 항목1", "선택지 항목2"]
                  : [],
              type: event.target.value as ApplicationFormBlockType,
            })
          }
          value={block.type}
        >
          {editableBlockTypes.map((item) => (
            <option key={item.type} value={item.type}>
              {item.label}
            </option>
          ))}
        </select>
        {isQuestionBlock(block) ? (
          <label className="flex items-center gap-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C]">
            필수항목
            <input
              checked={block.required}
              className="accent-[#FF9A3D]"
              onChange={(event) => onUpdate({ required: event.target.checked })}
              type="checkbox"
            />
          </label>
        ) : null}
        <div className="ml-auto flex items-center gap-[var(--host-12)] text-[#6D7A8A]">
          <button aria-label="복제" onClick={onDuplicate} type="button">
            <Copy size={18} strokeWidth={1.8} />
          </button>
          <button aria-label="찾기" type="button">
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button aria-label="삭제" onClick={onRemove} type="button">
            <Trash2 size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <input
        className="host-form-input"
        onChange={(event) => onUpdate({ label: event.target.value })}
        placeholder="질문을 입력해주세요"
        value={block.label}
      />

      {block.type === "singleSelect" || block.type === "multiSelect" ? (
        <div className="flex flex-col gap-[var(--host-8)]">
          {options.map((option, index) => (
            <div
              className="flex items-center gap-[var(--host-8)] pl-[var(--host-12)]"
              key={`${block.id}-${index}`}
            >
              <input
                className="size-[var(--host-14)] accent-[#FF9A3D]"
                type={block.type === "singleSelect" ? "radio" : "checkbox"}
              />
              <input
                className="host-form-input h-[var(--host-30)]"
                onChange={(event) => {
                  const nextOptions = [...options];
                  nextOptions[index] = event.target.value;
                  onUpdate({ options: nextOptions });
                }}
                placeholder="선택항목을 입력해주세요"
                value={option}
              />
            </div>
          ))}
          <button
            className="w-fit text-[var(--host-12)] font-medium leading-[1.253] text-[#FF9A3D]"
            onClick={() =>
              onUpdate({ options: [...options, `선택지 항목${options.length + 1}`] })
            }
            type="button"
          >
            + 선택지 추가
          </button>
        </div>
      ) : null}

      {block.type === "checkbox" || block.type === "description" ? (
        <textarea
          className="min-h-[calc(var(--host-scale)*69px)] rounded-[7px] border border-[#CAC4BC] px-[var(--host-8)] py-[var(--host-10)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
          onChange={(event) => onUpdate({ body: event.target.value })}
          placeholder="게스트에게 안내할 내용을 입력해주세요"
          value={block.body ?? ""}
        />
      ) : null}

      {block.type === "image" ? (
        <div className="flex flex-col gap-[var(--host-10)]">
          <input
            className="host-form-input"
            onChange={(event) => onUpdate({ helper: event.target.value })}
            placeholder="게스트에게 선택 내용에 대해 적어 주세요"
            value={block.helper ?? ""}
          />
          <div className="grid h-[calc(var(--host-scale)*69px)] place-items-center rounded-[7px] border border-[#F7B267] text-center text-[var(--host-12)] font-medium leading-[1.253] text-[#D9D9D9]">
            <span>파일 업로드</span>
            <Upload className="text-[#FF9A3D]" size={16} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FormPreview({ template }: { template: ApplicationFormTemplate }) {
  return (
    <aside className="flex min-w-0 flex-col gap-[var(--host-8)] pt-[calc(var(--host-scale)*50px)] max-xl:pb-[var(--host-32)]">
      <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-black">
        게스트 신청서 폼 미리보기
      </h2>
      <p className="text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
        항목을 추가하면 여기에 미리보기가 표시돼요
      </p>
      <div className="flex w-[calc(var(--host-scale)*557px)] max-w-full flex-col gap-[calc(var(--host-scale)*33px)] rounded-[8px] border border-[#6D7A8A] p-[var(--host-18)]">
        <div className="flex flex-col gap-[var(--host-20)] border-b border-[#F7B267] px-[var(--host-6)] pb-[var(--host-20)]">
          <div className="flex items-center">
            <div className="h-[calc(var(--host-scale)*90px)] w-[calc(var(--host-scale)*87px)] shrink-0 rounded-[16px] bg-[#D9D9D9]" />
            <div className="flex w-[calc(var(--host-scale)*179px)] shrink-0 flex-col gap-[var(--host-4)] pl-[var(--host-6)]">
              <p className="text-[calc(var(--host-scale)*20px)] font-semibold leading-[1.253] text-[#5B3A29]">
                프로그램 제목 입력
              </p>
              <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
                프로그램 지역 위치
              </p>
              <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
                호스트명
              </p>
            </div>
            <div className="flex flex-1 items-center gap-[calc(var(--host-scale)*33px)] pl-[var(--host-6)] text-[var(--host-12)] text-[#6D7A8A]">
              <DateSummary label="시작일" />
              <DateSummary label="종료일" />
            </div>
          </div>
          <p className="text-[var(--host-16)] font-medium leading-[1.253] text-[#5B3A29]">
            {template.name || "프로그램 신청서 폼 제목"}
          </p>
          <p className="text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
            {template.description || "신청서를 작성전 안내사항을 꼭 읽어주세요"}
          </p>
        </div>

        <div className="flex flex-col gap-[var(--host-12)]">
          {template.blocks.length > 0 ? (
            template.blocks.map((block) => (
              <PreviewBlock block={block} key={block.id} />
            ))
          ) : (
            <PreviewBlock
              block={{
                id: "placeholder",
                label: "질문내용입니다.",
                options: [],
                required: true,
                type: "shortText",
              }}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function DateSummary({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-[calc(var(--host-scale)*13px)]">
      <p className="text-[var(--host-12)] font-normal leading-[1.6]">{label}</p>
      <p className="whitespace-nowrap text-[var(--host-12)] font-semibold leading-[1.253]">
        0000년 00년 00일
      </p>
    </div>
  );
}

function PreviewBlock({ block }: { block: ApplicationFormBlock }) {
  return (
    <div className="flex w-full flex-col gap-[var(--host-10)] border-b border-dashed border-[#F5E1D3] pb-[var(--host-20)]">
      <div className="flex items-center gap-[var(--host-10)] text-[var(--host-14)] font-medium leading-[1.253]">
        <p className="text-[#5B3A29]">{block.label || "질문내용입니다."}</p>
        {block.required ? (
          <p className="text-[var(--host-12)] text-[#FE701E]">*필수항목</p>
        ) : null}
      </div>
      <PreviewControl block={block} />
    </div>
  );
}

function PreviewControl({ block }: { block: ApplicationFormBlock }) {
  if (block.type === "multiSelect" || block.type === "singleSelect") {
    const options =
      block.options && block.options.length > 0
        ? block.options
        : ["선택지 항목1", "선택지 항목1", "선택지 항목1", "선택지 항목1"];

    return (
      <div className="grid grid-cols-2 gap-x-[var(--host-16)] gap-y-[var(--host-12)] px-[var(--host-14)]">
        {options.slice(0, 6).map((option, index) => (
          <label
            className="flex h-[var(--host-18)] items-center gap-[var(--host-8)] text-[var(--host-14)] font-medium leading-[1.253] text-[#5B3A29]"
            key={`${option}-${index}`}
          >
            <input
              className="size-[var(--host-14)]"
              type={block.type === "singleSelect" ? "radio" : "checkbox"}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (block.type === "checkbox") {
    return (
      <div className="flex flex-col gap-[calc(var(--host-scale)*25px)] px-[var(--host-14)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        <p>{block.body || "<호스트가 게스트에게 동의를 받는 내용에 대한 안내 사항 내용입니다.>"}</p>
        <label className="flex items-center gap-[var(--host-4)] text-[#5B3A29]">
          <input className="size-[var(--host-14)]" type="radio" />
          동의함
        </label>
      </div>
    );
  }

  if (block.type === "description") {
    return (
      <p className="px-[var(--host-14)] text-[var(--host-12)] font-medium leading-[1.6] text-[#6D7A8A]">
        {block.body || "<호스트가 업로드한 파일에 대한 안내 사항 내용입니다.>"}
      </p>
    );
  }

  if (block.type === "image") {
    return (
      <div className="flex flex-col gap-[var(--host-10)] px-[var(--host-14)]">
        <p className="text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          {block.helper || "<파일요청에 대한 안내 사항 내용입니다.>"}
        </p>
        <div className="flex w-fit flex-col items-center justify-center gap-[var(--host-10)] rounded-[6px] border border-[#F7B267] p-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#D9D9D9]">
          파일 업로드
          <Upload className="text-[#FF9A3D]" size={18} />
        </div>
      </div>
    );
  }

  if (block.type === "longText") {
    return (
      <textarea
        className="min-h-[calc(var(--host-scale)*90px)] rounded-[7px] border border-[#F7B267] px-[var(--host-12)] py-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] outline-none placeholder:text-[#D9D9D9]"
        placeholder="텍스트 입력"
      />
    );
  }

  return (
    <input
      className="h-[calc(var(--host-scale)*31px)] rounded-[7px] border border-[#F7B267] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] outline-none placeholder:text-[#D9D9D9]"
      placeholder={block.type === "phone" ? "숫자 입력" : "텍스트 입력"}
    />
  );
}
