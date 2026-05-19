import { isDemoModeEnabled } from "@/lib/demo-mode";

export type ApplicationFieldType = "text" | "textarea" | "select" | "checkbox";

export type ApplicationFormBlockType =
  | "title"
  | "description"
  | "divider"
  | "image"
  | "shortText"
  | "longText"
  | "singleSelect"
  | "multiSelect"
  | "checkbox"
  | "date"
  | "email"
  | "phone"
  | "pageBreak";

export type ApplicationFormBranch = {
  id: string;
  targetBlockId: string;
  value: string;
};

export type ApplicationFormBlock = {
  id: string;
  type: ApplicationFormBlockType;
  label: string;
  required: boolean;
  body?: string;
  branches?: ApplicationFormBranch[];
  helper?: string;
  imageAlt?: string;
  imageUrl?: string;
  imageWidth?: number;
  options?: string[];
};

export type ApplicationFormField = {
  id: string;
  label: string;
  type: ApplicationFieldType;
  required: boolean;
  helper?: string;
  options?: string[];
};

export type ApplicationFormTemplate = {
  id: string;
  name: string;
  description: string;
  programTitle: string;
  blocks: ApplicationFormBlock[];
  fields: ApplicationFormField[];
  updatedAt: string;
};

export const questionBlockTypes: ApplicationFormBlockType[] = [
  "shortText",
  "longText",
  "singleSelect",
  "multiSelect",
  "checkbox",
  "date",
  "email",
  "phone",
];

const fieldTypeValues: ApplicationFieldType[] = [
  "text",
  "textarea",
  "select",
  "checkbox",
];

const blockTypeValues: ApplicationFormBlockType[] = [
  "title",
  "description",
  "divider",
  "image",
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

export const seedApplicationFormTemplates: ApplicationFormTemplate[] = [
  normalizeApplicationFormTemplateShape({
    id: "form-boseong-tea-basic",
    name: "전체차LAB 기본 신청폼",
    description: "참여 동기, 가능 일정, 개인정보 동의를 확인합니다.",
    programTitle: "",
    updatedAt: "2026-05-04T00:00:00+09:00",
    blocks: [
      {
        id: "block-title",
        label: "전체차LAB 프로그램 신청",
        required: false,
        type: "title",
      },
      {
        id: "block-intro",
        body: "프로그램 운영자가 확인해야 하는 기본 정보를 작성해 주세요.",
        label: "안내",
        required: false,
        type: "description",
      },
      {
        id: "field-motivation",
        helper: "프로그램에 참여하려는 이유를 확인합니다.",
        label: "참여 동기",
        required: true,
        type: "longText",
      },
      {
        branches: [
          {
            id: "branch-experienced",
            targetBlockId: "field-receipt",
            value: "있음",
          },
        ],
        id: "field-tea-experience",
        label: "차 문화 경험이 있나요?",
        options: ["있음", "없음"],
        required: true,
        type: "singleSelect",
      },
      {
        id: "field-receipt",
        label: "영수증 제출 가능 여부",
        required: true,
        type: "checkbox",
      },
    ],
  }),
];

export function readApplicationFormTemplates(): ApplicationFormTemplate[] {
  return isDemoModeEnabled() ? seedApplicationFormTemplates : [];
}

export function mergeApplicationFormTemplates(
  primaryTemplates: ApplicationFormTemplate[],
  secondaryTemplates: ApplicationFormTemplate[],
): ApplicationFormTemplate[] {
  const seen = new Set<string>();
  const mergedTemplates: ApplicationFormTemplate[] = [];

  for (const template of [...primaryTemplates, ...secondaryTemplates]) {
    const normalizedTemplate = normalizeApplicationFormTemplateShape(template);
    const key = normalizedTemplate.id || normalizedTemplate.name;
    if (seen.has(key)) continue;

    seen.add(key);
    mergedTemplates.push(normalizedTemplate);
  }

  return mergedTemplates;
}

export function normalizeApplicationFormTemplateShape(
  input: unknown,
): ApplicationFormTemplate {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const blocks = normalizeApplicationFormBlocks(value.blocks);
  const fields = normalizeApplicationFormFields(value.fields);
  const normalizedBlocks = blocks.length > 0 ? blocks : fieldsToBlocks(fields);
  const normalizedFields =
    fields.length > 0 ? fields : blocksToFields(normalizedBlocks);

  return {
    blocks: normalizedBlocks,
    description: asString(value.description),
    fields: normalizedFields,
    id: asString(value.id) || `form-${Date.now()}`,
    name: asString(value.name) || "신청폼",
    programTitle: asString(value.programTitle),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

export function normalizeApplicationFormBlocks(
  value: unknown,
): ApplicationFormBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const block = item as Record<string, unknown>;
      const type = asBlockType(block.type);

      return {
        body: asString(block.body),
        branches: normalizeBranches(block.branches),
        helper: asString(block.helper),
        imageAlt: asString(block.imageAlt),
        imageUrl: asString(block.imageUrl),
        imageWidth: clampNumber(block.imageWidth, 20, 100, 100),
        id: asString(block.id) || `block-${index}-${Date.now()}`,
        label: asString(block.label) || defaultBlockLabel(type),
        options: asStringArray(block.options),
        required: Boolean(block.required),
        type,
      };
    });
}

export function normalizeApplicationFormFields(
  value: unknown,
): ApplicationFormField[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const field = item as Record<string, unknown>;

      return {
        helper: asString(field.helper),
        id: asString(field.id) || `field-${index}-${Date.now()}`,
        label: asString(field.label) || "질문",
        options: asStringArray(field.options),
        required: Boolean(field.required),
        type: asFieldType(field.type),
      };
    });
}

export function blocksToFields(
  blocks: ApplicationFormBlock[],
): ApplicationFormField[] {
  return blocks
    .filter((block) => questionBlockTypes.includes(block.type))
    .map((block) => ({
      helper: block.helper ?? "",
      id: block.id,
      label: block.label,
      options: block.options ?? [],
      required: block.required,
      type: blockTypeToLegacyFieldType(block.type),
    }));
}

export function fieldsToBlocks(
  fields: ApplicationFormField[],
): ApplicationFormBlock[] {
  return fields.map((field) => ({
    branches: [],
    helper: field.helper ?? "",
    imageAlt: "",
    imageUrl: "",
    imageWidth: 100,
    id: field.id,
    label: field.label,
    options: field.options ?? [],
    required: field.required,
    type: legacyFieldTypeToBlockType(field.type),
  }));
}

export function createEmptyBlock(
  type: ApplicationFormBlockType = "shortText",
): ApplicationFormBlock {
  return {
    body: type === "description" ? "설명을 입력하세요." : "",
    branches: [],
    helper: "",
    imageAlt: "",
    imageUrl: "",
    imageWidth: 100,
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: defaultBlockLabel(type),
    options:
      type === "singleSelect" || type === "multiSelect"
        ? ["선택지 1", "선택지 2"]
        : [],
    required: false,
    type,
  };
}

export function createEmptyField(): ApplicationFormField {
  return blocksToFields([createEmptyBlock("shortText")])[0];
}

export function createEmptyTemplate(): ApplicationFormTemplate {
  return normalizeApplicationFormTemplateShape({
    blocks: [],
    description: "",
    id: `form-${Date.now()}`,
    name: "새 신청폼",
    programTitle: "",
    updatedAt: new Date().toISOString(),
  });
}

export function cloneApplicationFormTemplate(
  template: ApplicationFormTemplate,
  overrides: Partial<Pick<ApplicationFormTemplate, "description" | "name" | "programTitle">> = {},
): ApplicationFormTemplate {
  const now = Date.now();
  const normalizedTemplate = normalizeApplicationFormTemplateShape(template);
  const blocks = normalizedTemplate.blocks.map((block) => ({
    ...block,
    branches: (block.branches ?? []).map((branch) => ({
      ...branch,
      id: `branch-${now}-${Math.random().toString(36).slice(2, 7)}`,
    })),
    id: `${block.id}-copy-${now}`,
  }));

  return normalizeApplicationFormTemplateShape({
    ...normalizedTemplate,
    ...overrides,
    blocks,
    fields: blocksToFields(blocks),
    id: `form-${now}`,
    name: overrides.name ?? `${normalizedTemplate.name} 복사본`,
    updatedAt: new Date().toISOString(),
  });
}

export function isQuestionBlock(block: ApplicationFormBlock): boolean {
  return questionBlockTypes.includes(block.type);
}

function normalizeBranches(value: unknown): ApplicationFormBranch[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const branch = item as Record<string, unknown>;
      return {
        id: asString(branch.id) || `branch-${index}-${Date.now()}`,
        targetBlockId: asString(branch.targetBlockId),
        value: asString(branch.value),
      };
    })
    .filter((branch) => branch.value && branch.targetBlockId);
}

function asBlockType(value: unknown): ApplicationFormBlockType {
  const text = asString(value);
  if (blockTypeValues.includes(text as ApplicationFormBlockType)) {
    return text as ApplicationFormBlockType;
  }
  return legacyFieldTypeToBlockType(asFieldType(text));
}

function asFieldType(value: unknown): ApplicationFieldType {
  const text = asString(value);
  return fieldTypeValues.includes(text as ApplicationFieldType)
    ? (text as ApplicationFieldType)
    : "text";
}

function legacyFieldTypeToBlockType(
  type: ApplicationFieldType,
): ApplicationFormBlockType {
  if (type === "textarea") return "longText";
  if (type === "select") return "singleSelect";
  if (type === "checkbox") return "checkbox";
  return "shortText";
}

function blockTypeToLegacyFieldType(
  type: ApplicationFormBlockType,
): ApplicationFieldType {
  if (type === "longText") return "textarea";
  if (type === "singleSelect" || type === "multiSelect") return "select";
  if (type === "checkbox") return "checkbox";
  return "text";
}

function defaultBlockLabel(type: ApplicationFormBlockType): string {
  const labels: Record<ApplicationFormBlockType, string> = {
    checkbox: "동의 항목",
    date: "날짜",
    description: "설명",
    divider: "구분선",
    image: "이미지",
    email: "이메일",
    longText: "긴 답변",
    multiSelect: "복수 선택",
    pageBreak: "페이지",
    phone: "연락처",
    shortText: "짧은 답변",
    singleSelect: "단일 선택",
    title: "제목",
  };

  return labels[type];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}
