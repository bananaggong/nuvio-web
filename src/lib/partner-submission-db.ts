import { getDb } from "@/db/client";
import { partnerSubmissions } from "@/db/schema";

export type PartnerSubmissionInput = {
  description: string;
  email: string;
  manager: string;
  organization: string;
  phone: string;
  plannedPrograms: string;
  region: string;
  url: string;
  villageName: string;
};

export type PartnerSubmissionRecord = PartnerSubmissionInput & {
  createdAt: string;
  id: string;
  status: string;
  submissionType: "operation_inquiry";
  title: string;
};

type PartnerSubmissionRow = typeof partnerSubmissions.$inferSelect;

export async function createPartnerSubmission(
  input: PartnerSubmissionInput,
): Promise<PartnerSubmissionRecord> {
  const normalized = normalizePartnerSubmissionInput(input);
  const [row] = await getDb()
    .insert(partnerSubmissions)
    .values({
      organizationName: normalized.organization,
      contactName: normalized.manager,
      contactEmail: normalized.email,
      contactPhone: normalized.phone || null,
      title: normalized.villageName,
      region: normalized.region || null,
      payload: normalized,
      status: "submitted",
    })
    .returning();

  return mapPartnerSubmissionRow(row);
}

export function normalizePartnerSubmissionInput(
  input: unknown,
): PartnerSubmissionInput {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const normalized = {
    description: cleanText(value.description, 3000),
    email: cleanText(value.email, 160).toLowerCase(),
    manager: cleanText(value.manager, 80),
    organization: cleanText(value.organization, 160),
    phone: cleanText(value.phone, 40),
    plannedPrograms: cleanText(value.plannedPrograms, 3000),
    region: cleanText(value.region, 120),
    url: normalizeOptionalUrl(value.url),
    villageName: cleanText(value.villageName, 160),
  };

  if (!normalized.villageName) throw new Error("채널 이름을 입력해 주세요.");
  if (!normalized.organization) throw new Error("운영 주체를 입력해 주세요.");
  if (!normalized.manager) throw new Error("담당자명을 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized.email)) {
    throw new Error("연락 가능한 이메일을 입력해 주세요.");
  }
  if (!normalized.description) throw new Error("채널 소개를 입력해 주세요.");
  if (!normalized.plannedPrograms) {
    throw new Error("운영 예정 프로그램을 입력해 주세요.");
  }

  return normalized;
}

function mapPartnerSubmissionRow(
  row: PartnerSubmissionRow,
): PartnerSubmissionRecord {
  const payload = normalizePartnerSubmissionPayload(row.payload);

  return {
    ...payload,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    status: row.status,
    submissionType: "operation_inquiry",
    title: row.title,
  };
}

function normalizePartnerSubmissionPayload(
  payload: Record<string, unknown>,
): PartnerSubmissionInput {
  return {
    description: cleanText(payload.description, 3000),
    email: cleanText(payload.email, 160).toLowerCase(),
    manager: cleanText(payload.manager, 80),
    organization: cleanText(payload.organization, 160),
    phone: cleanText(payload.phone, 40),
    plannedPrograms: cleanText(payload.plannedPrograms, 3000),
    region: cleanText(payload.region, 120),
    url: cleanText(payload.url, 400),
    villageName: cleanText(payload.villageName, 160),
  };
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeOptionalUrl(value: unknown): string {
  const text = cleanText(value, 400);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported URL protocol.");
    }
    return url.toString().slice(0, 400);
  } catch {
    throw new Error("URL은 http:// 또는 https://로 시작하는 주소만 입력할 수 있습니다.");
  }
}
