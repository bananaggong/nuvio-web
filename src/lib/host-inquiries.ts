export type HostInquiryStatus = "new" | "inReview" | "answered" | "closed";

export type HostInquiry = {
  id: string;
  villageId?: string;
  programId?: string;
  formId?: string;
  programTitle: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  title: string;
  message: string;
  status: HostInquiryStatus;
  answers: Record<string, unknown>;
  source: string;
  submittedAt: string;
  updatedAt: string;
};

export const hostInquiryStatusLabels: Record<HostInquiryStatus, string> = {
  answered: "답변 완료",
  closed: "종료",
  inReview: "확인 중",
  new: "새 문의",
};

export function normalizeHostInquiryStatus(value: unknown): HostInquiryStatus {
  const text = typeof value === "string" ? value : "";
  if (text === "inReview" || text === "answered" || text === "closed") {
    return text;
  }
  return "new";
}

export function normalizeHostInquiry(input: unknown): HostInquiry {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return {
    answers: asRecord(value.answers),
    contactEmail: asString(value.contactEmail),
    contactName: asString(value.contactName) || "문의자",
    contactPhone: asString(value.contactPhone),
    formId: asString(value.formId),
    id: asString(value.id) || `inquiry-${Date.now()}`,
    message: asString(value.message),
    programId: asString(value.programId),
    programTitle: asString(value.programTitle),
    source: asString(value.source) || "program",
    status: normalizeHostInquiryStatus(value.status),
    submittedAt: asString(value.submittedAt) || new Date().toISOString(),
    title: asString(value.title) || "문의",
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    villageId: asString(value.villageId),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
