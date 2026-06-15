import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplications,
  programs as programsTable,
  scheduledMessages,
} from "@/db/schema";
import {
  renderMessageTemplate,
  type MessageCampaignStatus,
  type MessageChannel,
} from "@/lib/message-automation";
import type { HostApplication } from "@/lib/host-operations";

type ScheduleSelectedMessagesInput = {
  applicationIds: string[];
  channel: MessageChannel;
  scheduledFor: string;
  status: MessageCampaignStatus;
  templateBody: string;
  templateId?: string;
};

export type ScheduleSelectedMessagesResult = {
  insertedCount: number;
  recipientCount: number;
};

export async function scheduleSelectedApplicationMessages(
  input: ScheduleSelectedMessagesInput,
): Promise<ScheduleSelectedMessagesResult> {
  const applicationIds = Array.from(
    new Set(input.applicationIds.map((id) => id.trim()).filter(isUuid)),
  );
  if (applicationIds.length === 0) {
    return { insertedCount: 0, recipientCount: input.applicationIds.length };
  }

  const rows = await getDb()
    .select({
      id: programApplications.id,
      programId: programApplications.programId,
      programTitle: programsTable.title,
      applicantName: programApplications.applicantName,
      email: programApplications.email,
      phone: programApplications.phone,
      status: programApplications.status,
      submittedAt: programApplications.submittedAt,
      paymentAmount: programApplications.paymentAmount,
      receiptCount: programApplications.receiptCount,
      signatureCompleted: programApplications.signatureCompleted,
      reviewSubmitted: programApplications.reviewSubmitted,
      answers: programApplications.answers,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .where(inArray(programApplications.id, applicationIds));

  const scheduledFor = parseKoreaLocalDatetime(input.scheduledFor);
  const values = rows
    .map((row) => {
      const application: HostApplication = {
        answers: row.answers,
        applicantName: row.applicantName,
        email: row.email,
        formId: undefined,
        id: row.id,
        memo: "",
        paymentAmount: row.paymentAmount,
        phone: row.phone ?? "",
        programId: row.programId,
        programTitle: row.programTitle ?? "누비오 프로그램",
        receiptCount: row.receiptCount,
        reviewSubmitted: row.reviewSubmitted,
        signatureCompleted: row.signatureCompleted,
        status: row.status,
        submittedAt: row.submittedAt.toISOString(),
      };
      const recipient = input.channel === "email" ? application.email : application.phone;

      if (!recipient.trim()) return null;

      return {
        applicationId: row.id,
        body: renderMessageTemplate(input.templateBody, application),
        channel: input.channel,
        deliveryStatus: input.status,
        recipient,
        scheduledFor,
        sentAt: input.status === "sent" ? new Date() : null,
        templateId: isUuid(input.templateId ?? "") ? input.templateId : null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (values.length === 0) {
    return { insertedCount: 0, recipientCount: rows.length };
  }

  const insertedRows = await getDb().insert(scheduledMessages).values(values).returning({
    id: scheduledMessages.id,
  });

  return { insertedCount: insertedRows.length, recipientCount: rows.length };
}

function parseKoreaLocalDatetime(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(text)) {
    return new Date(`${text}:00+09:00`);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
