type DisplayCodeOptions = {
  fallback?: string;
  length?: number;
  prefix: string;
};

type ProgramDisplayNameOptions = {
  fallback?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LONG_HASH_PATTERN = /^[0-9a-f]{16,}$/iu;
const DASHED_HASH_PATTERN = /^[0-9a-f]{6,}(?:-[0-9a-f]{3,})+$/iu;
const SLUG_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/u;

function groupCode(value: string): string {
  return value.match(/.{1,4}/gu)?.join("-") ?? value;
}

function normalizeIdentifier(value: number | string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/[^a-z0-9]/giu, "")
    .toUpperCase();
}

function formatDateCode(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function formatDisplayCode(
  value: number | string | null | undefined,
  { fallback = "-", length = 8, prefix }: DisplayCodeOptions,
): string {
  const normalizedValue = normalizeIdentifier(value);

  if (!normalizedValue) return fallback;

  return `${prefix}-${groupCode(normalizedValue.slice(0, length))}`;
}

export function formatApplicationDisplayCode(
  applicationId: number | string | null | undefined,
  submittedAt?: Date | string | null,
): string {
  const normalizedValue = normalizeIdentifier(applicationId);
  const dateCode = formatDateCode(submittedAt);

  if (normalizedValue && dateCode) {
    return `A-${dateCode.slice(2)}-${normalizedValue.slice(0, 4)}`;
  }

  if (normalizedValue) return `A-${normalizedValue.slice(0, 6)}`;

  return "A-000000-0000";
}

export function formatProgramDisplayCode(
  programId: number | string | null | undefined,
): string {
  const normalizedValue = normalizeIdentifier(programId);
  if (!normalizedValue) return "P-000000";

  return `P-${normalizedValue.slice(0, 6)}`;
}

export function looksLikeInternalIdentifier(value: string | null | undefined): boolean {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) return false;

  return (
    UUID_PATTERN.test(trimmedValue) ||
    LONG_HASH_PATTERN.test(trimmedValue) ||
    DASHED_HASH_PATTERN.test(trimmedValue) ||
    SLUG_IDENTIFIER_PATTERN.test(trimmedValue)
  );
}

export function formatProgramDisplayName(
  programTitle: string | null | undefined,
  programId?: number | string | null,
  { fallback = "프로그램 제목 미정" }: ProgramDisplayNameOptions = {},
): string {
  const trimmedTitle = String(programTitle ?? "").trim();
  const fallbackIdentifier = String(programId ?? trimmedTitle).trim();

  if (!trimmedTitle || looksLikeInternalIdentifier(trimmedTitle)) {
    return fallbackIdentifier
      ? `${fallback} · ${formatProgramDisplayCode(fallbackIdentifier)}`
      : fallback;
  }

  return trimmedTitle;
}
