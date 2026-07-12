export function logServerPersistenceError(label: string, error: unknown) {
  const cause =
    error instanceof Error && "cause" in error
      ? (error as Error & { cause?: unknown }).cause
      : undefined;
  const record =
    cause && typeof cause === "object"
      ? (cause as Record<string, unknown>)
      : error && typeof error === "object"
        ? (error as Record<string, unknown>)
        : {};

  console.error(label, {
    code: asSafeDiagnostic(record.code),
    column: asSafeDiagnostic(record.column),
    constraint: asSafeDiagnostic(record.constraint),
    message: redactDiagnosticMessage(record.message),
    name: error instanceof Error ? error.name : "UnknownError",
    routine: asSafeDiagnostic(record.routine),
    table: asSafeDiagnostic(record.table),
  });
}

function asSafeDiagnostic(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, 120) : undefined;
}

function redactDiagnosticMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[redacted-email]")
    .replace(/\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/gu, "[redacted-phone]")
    .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/giu, "[redacted-id]")
    .slice(0, 240);
}
