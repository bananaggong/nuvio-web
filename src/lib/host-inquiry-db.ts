import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programInquiries } from "@/db/schema";
import {
  normalizeHostInquiry,
  normalizeHostInquiryStatus,
  type HostInquiry,
  type HostInquiryStatus,
} from "@/lib/host-inquiries";

type InquiryInsert = typeof programInquiries.$inferInsert;
type InquiryRow = typeof programInquiries.$inferSelect;

export async function listHostInquiriesFromDb(options: {
  programId?: string;
  villageIds?: string[];
} = {}): Promise<HostInquiry[]> {
  let query = getDb()
    .select()
    .from(programInquiries)
    .$dynamic();
  const conditions = [];

  if (options.programId) {
    conditions.push(eq(programInquiries.programId, options.programId));
  }

  if (options.villageIds) {
    if (options.villageIds.length === 0) return [];
    conditions.push(inArray(programInquiries.villageId, options.villageIds));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(desc(programInquiries.createdAt)).limit(300);
  return rows.map(mapInquiryRowToInquiry);
}

export async function createProgramInquiry(
  inquiry: HostInquiry,
): Promise<HostInquiry> {
  const insertValue = mapInquiryToInsert(inquiry);
  const [row] = await getDb()
    .insert(programInquiries)
    .values(insertValue)
    .returning();

  return mapInquiryRowToInquiry(row);
}

export async function updateHostInquiryStatus(
  inquiryId: string,
  status: HostInquiryStatus,
  options: { villageIds?: string[] } = {},
): Promise<HostInquiry | null> {
  if (options.villageIds && options.villageIds.length === 0) return null;

  const conditions = [eq(programInquiries.id, inquiryId)];

  if (options.villageIds) {
    conditions.push(inArray(programInquiries.villageId, options.villageIds));
  }

  const [row] = await getDb()
    .update(programInquiries)
    .set({ status, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  return row ? mapInquiryRowToInquiry(row) : null;
}

function mapInquiryToInsert(inquiry: HostInquiry): InquiryInsert {
  const normalizedInquiry = normalizeHostInquiry(inquiry);

  return {
    answers: normalizedInquiry.answers,
    contactEmail: normalizedInquiry.contactEmail || null,
    contactName: normalizedInquiry.contactName,
    contactPhone: normalizedInquiry.contactPhone || null,
    formId: isUuid(normalizedInquiry.formId ?? "")
      ? normalizedInquiry.formId
      : null,
    message: normalizedInquiry.message,
    programId: isUuid(normalizedInquiry.programId ?? "")
      ? normalizedInquiry.programId
      : null,
    programTitle: normalizedInquiry.programTitle || null,
    source: normalizedInquiry.source,
    status: normalizedInquiry.status,
    title: normalizedInquiry.title,
    villageId: isUuid(normalizedInquiry.villageId ?? "")
      ? normalizedInquiry.villageId
      : null,
  };
}

function mapInquiryRowToInquiry(row: InquiryRow): HostInquiry {
  return normalizeHostInquiry({
    answers: row.answers,
    contactEmail: row.contactEmail ?? "",
    contactName: row.contactName,
    contactPhone: row.contactPhone ?? "",
    formId: row.formId ?? "",
    id: row.id,
    message: row.message,
    programId: row.programId ?? "",
    programTitle: row.programTitle ?? "",
    source: row.source,
    status: normalizeHostInquiryStatus(row.status),
    submittedAt: row.createdAt.toISOString(),
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    villageId: row.villageId ?? "",
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
