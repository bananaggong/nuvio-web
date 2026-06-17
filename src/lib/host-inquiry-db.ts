import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programInquiries, programInquiryMessages } from "@/db/schema";
import {
  normalizeHostInquiry,
  normalizeHostInquiryStatus,
  normalizeProgramInquiryMessage,
  type HostInquiry,
  type HostInquiryStatus,
  type ProgramInquiryMessage,
  type ProgramInquiryMessageSenderRole,
} from "@/lib/host-inquiries";

type InquiryInsert = typeof programInquiries.$inferInsert;
type InquiryRow = typeof programInquiries.$inferSelect;
type InquiryMessageInsert = typeof programInquiryMessages.$inferInsert;
type InquiryMessageRow = typeof programInquiryMessages.$inferSelect;

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

  const rows = await query.orderBy(desc(programInquiries.updatedAt)).limit(300);
  return mapInquiryRowsToInquiries(rows);
}

export async function listUserProgramInquiriesFromDb(
  submittedBy: string,
): Promise<HostInquiry[]> {
  if (!isUuid(submittedBy)) return [];

  const rows = await getDb()
    .select()
    .from(programInquiries)
    .where(eq(programInquiries.submittedBy, submittedBy))
    .orderBy(desc(programInquiries.createdAt))
    .limit(100);

  return mapInquiryRowsToInquiries(rows);
}

export async function createProgramInquiry(
  inquiry: HostInquiry,
): Promise<HostInquiry> {
  const insertValue = mapInquiryToInsert(inquiry);
  const [row] = await getDb()
    .insert(programInquiries)
    .values(insertValue)
    .returning();

  const savedInquiry = mapInquiryRowToInquiry(row);
  const message = await createProgramInquiryMessage(row.id, {
    message: savedInquiry.message,
    senderId: savedInquiry.submittedBy,
    senderName: savedInquiry.contactName,
    senderRole: "user",
  });

  return {
    ...savedInquiry,
    messages: message ? [message] : savedInquiry.messages,
  };
}

export async function getHostInquiryFromDb(
  inquiryId: string,
  options: { villageIds?: string[] } = {},
): Promise<HostInquiry | null> {
  if (!isUuid(inquiryId)) return null;
  if (options.villageIds && options.villageIds.length === 0) return null;

  const conditions = [eq(programInquiries.id, inquiryId)];

  if (options.villageIds) {
    conditions.push(inArray(programInquiries.villageId, options.villageIds));
  }

  const rows = await getDb()
    .select()
    .from(programInquiries)
    .where(and(...conditions))
    .limit(1);

  const [inquiry] = await mapInquiryRowsToInquiries(rows);
  return inquiry ?? null;
}

export async function getUserProgramInquiryFromDb(
  inquiryId: string,
  submittedBy: string,
): Promise<HostInquiry | null> {
  if (!isUuid(inquiryId) || !isUuid(submittedBy)) return null;

  const rows = await getDb()
    .select()
    .from(programInquiries)
    .where(
      and(
        eq(programInquiries.id, inquiryId),
        eq(programInquiries.submittedBy, submittedBy),
      ),
    )
    .limit(1);

  const [inquiry] = await mapInquiryRowsToInquiries(rows);
  return inquiry ?? null;
}

export async function createProgramInquiryMessage(
  inquiryId: string,
  input: {
    message: string;
    senderId?: string;
    senderName?: string;
    senderRole: ProgramInquiryMessageSenderRole;
    statusAfter?: HostInquiryStatus;
  },
): Promise<ProgramInquiryMessage | null> {
  const message = input.message.trim();
  if (!isUuid(inquiryId) || !message) return null;

  return getDb().transaction(async (tx) => {
    const updateValue: {
      status?: HostInquiryStatus;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (input.statusAfter) updateValue.status = input.statusAfter;

    const [inquiry] = await tx
      .update(programInquiries)
      .set(updateValue)
      .where(
        and(
          eq(programInquiries.id, inquiryId),
          ne(programInquiries.status, "closed"),
        ),
      )
      .returning({ id: programInquiries.id });

    if (!inquiry) return null;

    const insertValue: InquiryMessageInsert = {
      inquiryId,
      message,
      senderId: isUuid(input.senderId ?? "") ? input.senderId : null,
      senderName: input.senderName?.trim() || null,
      senderRole: input.senderRole,
    };

    const [row] = await tx
      .insert(programInquiryMessages)
      .values(insertValue)
      .returning();

    return mapInquiryMessageRowToMessage(row);
  });
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

  if (!row) return null;

  const [inquiry] = await mapInquiryRowsToInquiries([row]);
  return inquiry ?? null;
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
    submittedBy: isUuid(normalizedInquiry.submittedBy ?? "")
      ? normalizedInquiry.submittedBy
      : null,
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
    messages: [],
    programId: row.programId ?? "",
    programTitle: row.programTitle ?? "",
    source: row.source,
    status: normalizeHostInquiryStatus(row.status),
    submittedBy: row.submittedBy ?? "",
    submittedAt: row.createdAt.toISOString(),
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    villageId: row.villageId ?? "",
  });
}

async function mapInquiryRowsToInquiries(
  rows: InquiryRow[],
): Promise<HostInquiry[]> {
  if (rows.length === 0) return [];

  const inquiries = rows.map(mapInquiryRowToInquiry);
  const messagesByInquiryId = await listProgramInquiryMessagesByInquiryIds(
    inquiries.map((inquiry) => inquiry.id),
  );

  return inquiries.map((inquiry) =>
    withFallbackMessage({
      ...inquiry,
      messages: messagesByInquiryId.get(inquiry.id) ?? [],
    }),
  );
}

async function listProgramInquiryMessagesByInquiryIds(
  inquiryIds: string[],
): Promise<Map<string, ProgramInquiryMessage[]>> {
  const validInquiryIds = inquiryIds.filter(isUuid);
  const messagesByInquiryId = new Map<string, ProgramInquiryMessage[]>();
  if (validInquiryIds.length === 0) return messagesByInquiryId;

  const rows = await getDb()
    .select()
    .from(programInquiryMessages)
    .where(inArray(programInquiryMessages.inquiryId, validInquiryIds))
    .orderBy(asc(programInquiryMessages.createdAt));

  for (const row of rows) {
    const message = mapInquiryMessageRowToMessage(row);
    messagesByInquiryId.set(message.inquiryId, [
      ...(messagesByInquiryId.get(message.inquiryId) ?? []),
      message,
    ]);
  }

  return messagesByInquiryId;
}

function mapInquiryMessageRowToMessage(
  row: InquiryMessageRow,
): ProgramInquiryMessage {
  return normalizeProgramInquiryMessage({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    inquiryId: row.inquiryId,
    message: row.message,
    senderId: row.senderId ?? "",
    senderName: row.senderName ?? "",
    senderRole: row.senderRole,
  });
}

function withFallbackMessage(inquiry: HostInquiry): HostInquiry {
  if (inquiry.messages.length > 0 || !inquiry.message) return inquiry;

  return {
    ...inquiry,
    messages: [
      {
        createdAt: inquiry.submittedAt,
        id: `${inquiry.id}-legacy-message`,
        inquiryId: inquiry.id,
        message: inquiry.message,
        senderName: inquiry.contactName,
        senderRole: "user",
      },
    ],
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
