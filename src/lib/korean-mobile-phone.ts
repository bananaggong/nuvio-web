export const KOREAN_MOBILE_PHONE_ERROR =
  "휴대전화번호는 010으로 시작하는 숫자 11자리로 입력해 주세요.";

export function normalizeKoreanMobilePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !/^[\d\s()+-]+$/u.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/gu, "");
  if (digits.startsWith("8210") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  return /^010\d{8}$/u.test(digits) ? digits : null;
}

export function requireKoreanMobilePhone(value: unknown): string {
  const normalized = normalizeKoreanMobilePhone(value);
  if (!normalized) throw new Error(KOREAN_MOBILE_PHONE_ERROR);
  return normalized;
}

export function formatKoreanMobilePhone(value: unknown): string {
  const normalized = normalizeKoreanMobilePhone(value);
  if (!normalized) return typeof value === "string" ? value.trim() : "";
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
}

export function formatKoreanMobilePhoneInput(value: string): string {
  const digits = value.replace(/\D/gu, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isKoreanMobilePhone(value: unknown): boolean {
  return normalizeKoreanMobilePhone(value) !== null;
}
