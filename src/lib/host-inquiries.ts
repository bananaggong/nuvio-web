export type HostInquiryStatus = "new" | "inReview" | "answered" | "closed";

export type ProgramInquiryMessageSenderRole = "host" | "user";

export type ProgramInquiryMessage = {
  id: string;
  inquiryId: string;
  senderRole: ProgramInquiryMessageSenderRole;
  senderId?: string;
  senderName?: string;
  message: string;
  createdAt: string;
};

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
  submittedBy?: string;
  messages: ProgramInquiryMessage[];
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
    messages: normalizeProgramInquiryMessages(value.messages),
    programId: asString(value.programId),
    programTitle: asString(value.programTitle),
    source: asString(value.source) || "program",
    status: normalizeHostInquiryStatus(value.status),
    submittedBy: asString(value.submittedBy),
    submittedAt: asString(value.submittedAt) || new Date().toISOString(),
    title: asString(value.title) || "문의",
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    villageId: asString(value.villageId),
  };
}

export function normalizeProgramInquiryMessage(
  input: unknown,
): ProgramInquiryMessage {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return {
    createdAt: asString(value.createdAt) || new Date().toISOString(),
    id: asString(value.id) || `message-${Date.now()}`,
    inquiryId: asString(value.inquiryId),
    message: asString(value.message),
    senderId: asString(value.senderId),
    senderName: asString(value.senderName),
    senderRole: normalizeProgramInquiryMessageSenderRole(value.senderRole),
  };
}

function normalizeProgramInquiryMessages(value: unknown): ProgramInquiryMessage[] {
  return Array.isArray(value)
    ? value.map(normalizeProgramInquiryMessage).filter((message) => message.message)
    : [];
}

function normalizeProgramInquiryMessageSenderRole(
  value: unknown,
): ProgramInquiryMessageSenderRole {
  return value === "host" ? "host" : "user";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
