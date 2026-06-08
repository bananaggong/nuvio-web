export const SUPPORT_INQUIRY_TYPES = [
  { value: "program", label: "프로그램 문의" },
  { value: "application", label: "신청/선정 문의" },
  { value: "account", label: "계정/로그인 문의" },
  { value: "benefit", label: "포인트 문의" },
  { value: "host", label: "호스트/로컬채널 문의" },
  { value: "other", label: "기타 문의" },
] as const;

export type SupportInquiryType = (typeof SUPPORT_INQUIRY_TYPES)[number]["value"];

export function getSupportInquiryLabel(value: string) {
  return SUPPORT_INQUIRY_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function isSupportInquiryType(value: string): value is SupportInquiryType {
  return SUPPORT_INQUIRY_TYPES.some((item) => item.value === value);
}
