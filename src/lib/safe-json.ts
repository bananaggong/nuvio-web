export type SafeJsonValue =
  | SafeJsonValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: SafeJsonValue };

type SanitizeJsonOptions = {
  maxArrayLength?: number;
  maxDepth?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;
};

const dangerousObjectKeys = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizeJsonRecord(
  value: unknown,
  options: SanitizeJsonOptions = {},
): Record<string, SafeJsonValue> {
  const sanitized = sanitizeJsonValue(value, options);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return {};
  }

  return sanitized;
}

export function sanitizeJsonValue(
  value: unknown,
  options: SanitizeJsonOptions = {},
): SafeJsonValue {
  return sanitizeJsonValueAtDepth(value, {
    maxArrayLength: options.maxArrayLength ?? 80,
    maxDepth: options.maxDepth ?? 8,
    maxObjectKeys: options.maxObjectKeys ?? 120,
    maxStringLength: options.maxStringLength ?? 2000,
  });
}

function sanitizeJsonValueAtDepth(
  value: unknown,
  options: Required<SanitizeJsonOptions>,
  depth = 0,
): SafeJsonValue {
  if (depth > options.maxDepth) {
    throw new Error("JSON payload is too deeply nested.");
  }

  if (value === null) return null;

  if (typeof value === "string") {
    return value.slice(0, options.maxStringLength);
  }

  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, options.maxArrayLength)
      .map((item) => sanitizeJsonValueAtDepth(item, options, depth + 1));
  }

  if (typeof value !== "object") return null;

  const result: Record<string, SafeJsonValue> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(
    0,
    options.maxObjectKeys,
  );

  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim().slice(0, 120);
    if (!key || dangerousObjectKeys.has(key)) continue;
    result[key] = sanitizeJsonValueAtDepth(rawValue, options, depth + 1);
  }

  return result;
}
