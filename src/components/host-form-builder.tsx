"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
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
import { nuvioIcons } from "@/components/icons/nuvio-icons";

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
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1864)]">
      <section className="min-w-0 flex-1 overflow-x-auto pl-[var(--host-28)] pr-[var(--host-22)] max-md:px-5">
        <div className="grid min-w-[var(--host-1158)] grid-cols-[var(--host-577)_var(--host-557)] gap-[var(--host-24)] max-md:min-w-0 max-md:grid-cols-1">
          <section className="min-h-[var(--host-1864)] border-r border-[#6D7A8A] pr-[var(--host-30)] max-md:min-h-0 max-md:border-r-0 max-md:pr-0">
            <div className="flex flex-col gap-[var(--host-46)] pb-[var(--host-24)]">
              <div className="pt-[var(--host-24)]">
                <div className="flex h-[var(--host-29)] items-center gap-[var(--host-14)]">
                  <Link
                    aria-label="목록으로"
                    className="inline-flex h-[var(--host-29)] w-[var(--host-11)] items-center justify-center"
                    href="/host/forms"
                  >
                    <Image
                      alt=""
                      aria-hidden
                      className="h-[var(--host-17)] w-[var(--host-11)]"
                      height={17}
                      src={nuvioIcons.formEditorBack}
                      width={11}
                    />
                  </Link>
                  <h1 className="whitespace-nowrap text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                    신청서 양식 편집
                  </h1>
                  <button
                    className="inline-flex h-[var(--host-29)] w-[var(--host-66)] items-center justify-center rounded-[4px] bg-[#FE701E] p-0 text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void saveTemplate()}
                    type="button"
                  >
                    {isSaving ? "저장중" : "저장하기"}
                  </button>
                </div>
              </div>

              <section className="flex w-[var(--host-547)] max-w-full flex-col gap-[var(--host-33)] rounded-[8px] p-[var(--host-18)] ring-1 ring-inset ring-[#6D7A8A]">
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
                      className="host-form-input host-form-input--tall appearance-none pr-[var(--host-34)]"
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
                    <Image
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute right-[var(--host-14)] top-1/2 h-[var(--host-19)] w-[var(--host-19)] -translate-y-1/2"
                      height={20}
                      src={nuvioIcons.formSelectDropdown}
                      width={19}
                    />
                  </label>
                </EditorField>
              </section>

              <section className="flex w-[var(--host-547)] max-w-full flex-col gap-[var(--host-14)] px-[var(--host-18)] pb-[var(--host-18)]">
                <h2 className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
                  항목 추가
                </h2>
                <div className="flex flex-col gap-[var(--host-28)]">
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
                  <span className="grid size-[var(--host-28)] place-items-center rounded-full bg-[#FF9A3D] text-white">
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
      </section>
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

function FormItemIconButton({
  ariaLabel,
  className,
  height,
  onClick,
  src,
  width,
}: {
  ariaLabel: string;
  className: string;
  height: number;
  onClick?: () => void;
  src: string;
  width: number;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center justify-center p-0 transition-opacity hover:opacity-70"
      onClick={onClick}
      type="button"
    >
      <Image
        alt=""
        aria-hidden
        className={className}
        height={height}
        src={src}
        width={width}
      />
    </button>
  );
}

function getEditableBlockTypeLabel(type: ApplicationFormBlockType) {
  return editableBlockTypes.find((item) => item.type === type)?.label ?? "텍스트";
}

function getQuestionPlaceholder(type: ApplicationFormBlockType) {
  switch (type) {
    case "phone":
      return "질문을 입력해주세요 *답변은 숫자 입력만 가능해요.";
    case "singleSelect":
      return "질문을 입력해주세요 *답변은 하나만 선택 가능해요.";
    case "multiSelect":
      return "질문을 입력해주세요 *답변은 여러 개 선택 가능해요.";
    case "image":
      return "질문을 입력해주세요 *답변은 파일 업로드만 가능해요.";
    case "description":
      return "안내할 내용을 입력해주세요.";
    case "checkbox":
      return "동의 항목의 제목을 입력해주세요.";
    default:
      return "질문을 입력해주세요 *답변은 텍스트 입력만 가능해요.";
  }
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
  const blockTypeLabel = getEditableBlockTypeLabel(block.type);

  return (
    <article className="flex w-full flex-col gap-[var(--host-6)] border-b border-[#F3F3F3] py-[var(--host-16)]">
      <div className="flex h-[var(--host-20)] items-center gap-[var(--host-11)] px-[var(--host-12)]">
        <label className="relative inline-flex h-[var(--host-19)] shrink-0 items-center rounded-[19px] bg-[#6D7A8A] px-[var(--host-12)] text-[var(--host-12)] font-semibold leading-[1.253]">
          <span className="relative z-10 text-[#F9F9F9]">{blockTypeLabel}</span>
          <select
            aria-label="항목 유형"
            className="absolute inset-0 z-20 h-full w-full cursor-pointer"
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
            style={{ opacity: 0 }}
            value={block.type}
          >
            {editableBlockTypes.map((item) => (
              <option key={item.type} value={item.type}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {isQuestionBlock(block) ? (
          <RequiredToggle
            checked={block.required}
            onChange={(checked) => onUpdate({ required: checked })}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-[var(--host-15)]">
          <FormItemIconButton
            ariaLabel="복제"
            className="h-[var(--host-19)] w-[var(--host-19)]"
            height={20}
            onClick={onDuplicate}
            src={nuvioIcons.formItemCopy}
            width={20}
          />
          <FormItemIconButton
            ariaLabel="조건 설정"
            className="h-[var(--host-14)] w-[var(--host-14)]"
            height={16}
            src={nuvioIcons.formItemCondition}
            width={16}
          />
          <FormItemIconButton
            ariaLabel="삭제"
            className="h-[var(--host-16)] w-[var(--host-14)]"
            height={18}
            onClick={onRemove}
            src={nuvioIcons.formItemTrash}
            width={16}
          />
        </div>
      </div>

      <input
        className="host-form-input host-form-input--tall"
        onChange={(event) => onUpdate({ label: event.target.value })}
        placeholder={getQuestionPlaceholder(block.type)}
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
                className="host-form-input host-form-input--compact"
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
          className="min-h-[var(--host-69)] rounded-[7px] border border-[#CAC4BC] px-[var(--host-8)] py-[var(--host-10)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
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
          <div className="grid h-[var(--host-69)] place-items-center rounded-[7px] border border-[#F7B267] text-center text-[var(--host-12)] font-medium leading-[1.253] text-[#D9D9D9]">
            <span>파일 업로드</span>
            <Upload className="text-[#FF9A3D]" size={16} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function RequiredToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="flex h-[var(--host-20)] items-center gap-[var(--host-7)] text-[var(--host-12)] font-normal leading-[1.253] text-[#0D0D0C]"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>필수항목</span>
      <Image
        alt=""
        aria-hidden
        className="h-[var(--host-20)] w-[var(--host-23)]"
        height={20}
        src={
          checked
            ? nuvioIcons.formRequiredToggleOn
            : nuvioIcons.formRequiredToggleOff
        }
        width={23}
      />
    </button>
  );
}

function FormPreview({ template }: { template: ApplicationFormTemplate }) {
  return (
    <aside className="flex w-[var(--host-557)] shrink-0 flex-col gap-[var(--host-8)] pt-[var(--host-50)] max-md:w-full max-md:pb-[var(--host-32)]">
      <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-black">
        게스트 신청서 폼 미리보기
      </h2>
      <p className="text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
        항목을 추가하면 여기에 미리보기가 표시돼요
      </p>
      <div className="min-h-[var(--host-1261)] w-full rounded-[8px] border border-[#6D7A8A] p-[var(--host-18)]">
        <div className="w-[var(--host-521)] max-w-full">
          <div className="flex h-[var(--host-188)] flex-col border-b border-[#F7B267] px-[var(--host-6)]">
            <div className="flex h-[var(--host-90)] w-[var(--host-509)] max-w-full">
              <div className="h-[var(--host-90)] w-[var(--host-87)] shrink-0 rounded-[16px] bg-[#D9D9D9]" />
              <div className="flex h-[var(--host-71)] w-[var(--host-179)] shrink-0 flex-col justify-start gap-[var(--host-4)] px-[var(--host-6)] pt-[var(--host-10)]">
                <p className="truncate text-[var(--host-20)] font-semibold leading-[1.253] text-[#5B3A29]">
                  {template.programTitle || "프로그램 제목 입력"}
                </p>
                <p className="truncate text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
                  프로그램 지역 위치
                </p>
                <p className="truncate text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
                  호스트명
                </p>
              </div>
              <div className="flex h-[var(--host-90)] w-[var(--host-243)] shrink-0 items-center justify-between text-[#6D7A8A]">
                <DateSummary label="시작일" />
                <DateSummary label="종료일" />
              </div>
            </div>
            <p className="mt-[var(--host-20)] truncate text-[var(--host-16)] font-medium leading-[1.253] text-[#5B3A29]">
              {template.name || "프로그램 신청서 폼 제목"}
            </p>
            <p className="mt-[var(--host-20)] line-clamp-2 text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              {template.description || "신청서를 작성전 안내사항을 꼭 읽어주세요"}
            </p>
          </div>

          <div className="mt-[var(--host-33)] flex flex-col">
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
      </div>
    </aside>
  );
}

function DateSummary({ label }: { label: string }) {
  return (
    <div className="flex w-[var(--host-105)] flex-col gap-[var(--host-13)]">
      <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
        {label}
      </p>
      <p className="whitespace-nowrap text-[var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
        0000년 00년 00일
      </p>
    </div>
  );
}

function PreviewBlock({ block }: { block: ApplicationFormBlock }) {
  return (
    <div className="flex w-full flex-col gap-[var(--host-10)] border-b border-dashed border-[#F5E1D3] py-[var(--host-12)]">
      <div className="flex h-[var(--host-18)] items-center gap-[var(--host-10)] text-[var(--host-14)] font-medium leading-[1.253]">
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

    if (block.type === "singleSelect") {
      return (
        <div className="relative h-[var(--host-31)] w-[var(--host-514)] max-w-full rounded-[7px] border border-[#F7B267] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[var(--host-31)] text-[#D9D9D9]">
          선택해 주세요.
          <ChevronDown
            aria-hidden="true"
            className="absolute right-[var(--host-8)] top-1/2 -translate-y-1/2 rounded-full bg-[#FF9A3D] text-white"
            size={18}
            strokeWidth={2.2}
          />
        </div>
      );
    }

    return (
      <div className="grid w-[var(--host-386)] grid-cols-2 gap-x-[var(--host-48)] gap-y-[var(--host-12)] px-[var(--host-14)]">
        {options.slice(0, 6).map((option, index) => (
          <label
            className="flex h-[var(--host-18)] items-center gap-[var(--host-8)] whitespace-nowrap text-[var(--host-14)] font-medium leading-[1.253] text-[#5B3A29]"
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
      <div className="flex flex-col gap-[var(--host-25)] px-[var(--host-14)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
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
      <div className="px-[var(--host-14)]">
        <div className="h-[var(--host-150)] w-[var(--host-354)] max-w-full bg-[#D9D9D9]" />
        <p className="mt-[var(--host-10)] text-[var(--host-12)] font-medium leading-[1.6] text-[#6D7A8A]">
          {block.body || "<호스트가 업로드한 파일에 대한 안내 사항 내용입니다.>"}
        </p>
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="flex flex-col gap-[var(--host-10)] px-[var(--host-14)]">
        <p className="text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          {block.helper || "<파일요청에 대한 안내 사항 내용입니다.>"}
        </p>
        <div className="flex h-[var(--host-52)] w-[var(--host-52)] flex-col items-center justify-center gap-[var(--host-4)] rounded-[6px] border border-[#F7B267] text-[var(--host-10)] font-medium leading-[1.253] text-[#D9D9D9]">
          파일 업로드
          <Upload className="text-[#FF9A3D]" size={18} />
        </div>
      </div>
    );
  }

  if (block.type === "longText") {
    return (
      <textarea
        className="min-h-[var(--host-70)] w-[var(--host-514)] max-w-full rounded-[7px] border border-[#F7B267] px-[var(--host-12)] py-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] outline-none placeholder:text-[#D9D9D9]"
        placeholder="텍스트 입력"
      />
    );
  }

  return (
    <input
      className="h-[var(--host-31)] w-[var(--host-514)] max-w-full rounded-[7px] border border-[#F7B267] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] outline-none placeholder:text-[#D9D9D9]"
      placeholder={block.type === "phone" ? "숫자 입력" : "텍스트 입력"}
    />
  );
}
