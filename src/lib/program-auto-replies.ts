export type ProgramAutoReplyItem = {
  enabled: boolean;
  id: string;
  label: string;
  response: string;
};

export type ProgramAutoReplyConfig = {
  enabled: boolean;
  greeting: string;
  id?: string;
  items: ProgramAutoReplyItem[];
  programId: string;
  updatedAt?: string;
  villageId?: string;
};

export const defaultProgramAutoReplyItems: ProgramAutoReplyItem[] = [
  {
    enabled: true,
    id: "meeting",
    label: "집합 장소 및 시간",
    response: "집합 장소와 시간은 프로그램 시작 전에 확정 안내드릴게요.",
  },
  {
    enabled: true,
    id: "preparation",
    label: "준비물과 복장",
    response: "편한 복장과 개인 물병을 준비해주세요. 추가 준비물이 있으면 별도로 안내드릴게요.",
  },
  {
    enabled: true,
    id: "refund",
    label: "취소 및 환불 규정",
    response: "취소 및 환불 규정은 신청 상태와 프로그램 일정에 따라 달라질 수 있어요.",
  },
];

export function createDefaultProgramAutoReplyConfig(
  programId = "",
): ProgramAutoReplyConfig {
  return {
    enabled: true,
    greeting:
      "안녕하세요. 궁금한 내용을 아래 버튼에서 먼저 확인하거나 직접 문의를 남겨주세요.",
    items: defaultProgramAutoReplyItems,
    programId,
  };
}

export function normalizeProgramAutoReplyConfig(
  input: unknown,
): ProgramAutoReplyConfig {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const programId = asString(value.programId);
  const fallback = createDefaultProgramAutoReplyConfig(programId);

  return {
    enabled:
      typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
    greeting: asString(value.greeting) || fallback.greeting,
    id: asString(value.id),
    items: normalizeProgramAutoReplyItems(value.items),
    programId,
    updatedAt: asString(value.updatedAt),
    villageId: asString(value.villageId),
  };
}

export function normalizeProgramAutoReplyItems(
  input: unknown,
): ProgramAutoReplyItem[] {
  const source = Array.isArray(input) ? input : defaultProgramAutoReplyItems;
  const items = source
    .map((item, index) => normalizeProgramAutoReplyItem(item, index))
    .filter((item) => item.label && item.response);

  return items.length > 0 ? items : defaultProgramAutoReplyItems;
}

function normalizeProgramAutoReplyItem(
  input: unknown,
  index: number,
): ProgramAutoReplyItem {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const fallback = defaultProgramAutoReplyItems[index];
  const label = asString(value.label) || fallback?.label || `자동응답 ${index + 1}`;
  const id = asString(value.id) || slugify(label) || `reply-${index + 1}`;

  return {
    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : (fallback?.enabled ?? true),
    id,
    label,
    response: asString(value.response) || asString(value.value) || fallback?.response || "",
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
