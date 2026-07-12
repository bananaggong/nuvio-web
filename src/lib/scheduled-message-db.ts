import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
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
import {
  appendManualDispatchRows,
  markManualDispatchRowsSent,
  type ManualDispatchSheetSyncResult,
} from "@/lib/manual-dispatch-sheet";
import {
  getSmsDeliveryReadiness,
  sendSmsMessage,
} from "@/lib/sms-provider";

type ScheduleSelectedMessagesInput = {
  applicationIds: string[];
  channel: MessageChannel;
  scheduledFor: string;
  status: MessageCampaignStatus;
  templateBody: string;
  templateId?: string;
};

export type ScheduledMessageDeliveryStatus =
  | MessageCampaignStatus
  | "failed"
  | "processing";

export type HostScheduledMessage = {
  applicationId: string;
  applicantName: string;
  body: string;
  channel: MessageChannel;
  createdAt: string;
  deliveryStatus: ScheduledMessageDeliveryStatus;
  error: string;
  id: string;
  programId: string;
  programTitle: string;
  recipient: string;
  scheduledFor: string;
  sentAt: string;
  submittedAt: string;
  updatedAt: string;
};

export type ScheduleSelectedMessagesResult = {
  insertedCount: number;
  recipientCount: number;
  sheetSync: ManualDispatchSheetSyncResult;
};

export type MarkHostScheduledMessagesSentResult = {
  sheetSync: ManualDispatchSheetSyncResult;
  updatedCount: number;
};

export async function scheduleSelectedApplicationMessages(
  input: ScheduleSelectedMessagesInput,
  options: { villageIds?: string[] } = {},
): Promise<ScheduleSelectedMessagesResult> {
  const applicationIds = Array.from(
    new Set(input.applicationIds.map((id) => id.trim()).filter(isUuid)),
  );
  if (options.villageIds && options.villageIds.length === 0) {
    return {
      insertedCount: 0,
      recipientCount: input.applicationIds.length,
      sheetSync: { message: "No manageable channel scope.", status: "skipped" },
    };
  }
  if (applicationIds.length === 0) {
    return {
      insertedCount: 0,
      recipientCount: input.applicationIds.length,
      sheetSync: { message: "No valid application ids.", status: "skipped" },
    };
  }

  const conditions: SQL[] = [inArray(programApplications.id, applicationIds)];
  if (options.villageIds) {
    conditions.push(inArray(programsTable.villageId, options.villageIds));
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
    .where(and(...conditions));

  const scheduledFor = parseKoreaLocalDatetime(input.scheduledFor);
  const deliveryStatus: MessageCampaignStatus =
    input.status === "draft" ? "draft" : "scheduled";
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
      const recipient =
        input.channel === "email" ? application.email : application.phone;

      if (!recipient.trim()) return null;

      return {
        applicationId: row.id,
        body: renderMessageTemplate(input.templateBody, application),
        channel: input.channel,
        deliveryStatus,
        recipient,
        scheduledFor,
        sentAt: null,
        templateId: isUuid(input.templateId ?? "") ? input.templateId : null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (values.length === 0) {
    return {
      insertedCount: 0,
      recipientCount: rows.length,
      sheetSync: { message: "No recipients with contact values.", status: "skipped" },
    };
  }

  const insertedRows = await getDb()
    .insert(scheduledMessages)
    .values(values)
    .returning({
      applicationId: scheduledMessages.applicationId,
      body: scheduledMessages.body,
      channel: scheduledMessages.channel,
      id: scheduledMessages.id,
      recipient: scheduledMessages.recipient,
      scheduledFor: scheduledMessages.scheduledFor,
      templateId: scheduledMessages.templateId,
    });

  const applicationsById = new Map(rows.map((row) => [row.id, row]));
  const sheetSync = await appendManualDispatchRows(
    insertedRows.map((row) => {
      const application = applicationsById.get(row.applicationId ?? "");

      return {
        applicationId: row.applicationId ?? "",
        applicantName: application?.applicantName ?? "",
        body: row.body,
        channel: row.channel,
        messageId: row.id,
        phone: row.recipient,
        programTitle: application?.programTitle ?? "",
        scheduledFor: row.scheduledFor,
        templateName: row.templateId ?? input.templateId ?? "",
        trigger: "호스트 수동예약",
      };
    }),
  );

  return {
    insertedCount: insertedRows.length,
    recipientCount: rows.length,
    sheetSync,
  };
}

export async function listHostScheduledMessages(
  options: { limit?: number; villageIds?: string[] } = {},
): Promise<HostScheduledMessage[]> {
  if (options.villageIds && options.villageIds.length === 0) return [];

  const conditions: SQL[] = [];
  if (options.villageIds) {
    conditions.push(inArray(programsTable.villageId, options.villageIds));
  }

  let query = getDb()
    .select({
      applicationId: programApplications.id,
      applicantName: programApplications.applicantName,
      body: scheduledMessages.body,
      channel: scheduledMessages.channel,
      createdAt: scheduledMessages.createdAt,
      deliveryStatus: scheduledMessages.deliveryStatus,
      error: scheduledMessages.error,
      id: scheduledMessages.id,
      programId: programApplications.programId,
      programTitle: programsTable.title,
      recipient: scheduledMessages.recipient,
      scheduledFor: scheduledMessages.scheduledFor,
      sentAt: scheduledMessages.sentAt,
      submittedAt: programApplications.submittedAt,
      updatedAt: scheduledMessages.updatedAt,
    })
    .from(scheduledMessages)
    .leftJoin(
      programApplications,
      eq(scheduledMessages.applicationId, programApplications.id),
    )
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .$dynamic();

  if (conditions.length === 1) {
    query = query.where(conditions[0]);
  } else if (conditions.length > 1) {
    query = query.where(and(...conditions));
  }

  const rows = await query
    .orderBy(desc(scheduledMessages.createdAt))
    .limit(options.limit ?? 200);

  return rows.map((row) => ({
    applicationId: row.applicationId ?? "",
    applicantName: row.applicantName ?? "신청자",
    body: row.body,
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    deliveryStatus: row.deliveryStatus,
    error: row.error ?? "",
    id: row.id,
    programId: row.programId ?? "",
    programTitle: row.programTitle ?? "누비오 프로그램",
    recipient: row.recipient,
    scheduledFor: row.scheduledFor?.toISOString() ?? "",
    sentAt: row.sentAt?.toISOString() ?? "",
    submittedAt: row.submittedAt?.toISOString() ?? "",
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function deleteHostScheduledMessages(
  messageIds: string[],
  options: { villageIds?: string[] } = {},
): Promise<number> {
  const normalizedIds = Array.from(
    new Set(messageIds.map((id) => id.trim()).filter(isUuid)),
  );
  if (normalizedIds.length === 0) return 0;
  if (options.villageIds && options.villageIds.length === 0) return 0;

  const conditions: SQL[] = [
    inArray(scheduledMessages.id, normalizedIds),
    eq(scheduledMessages.deliveryStatus, "draft"),
  ];
  if (options.villageIds) {
    conditions.push(inArray(programsTable.villageId, options.villageIds));
  }

  let allowedQuery = getDb()
    .select({
      id: scheduledMessages.id,
    })
    .from(scheduledMessages)
    .leftJoin(
      programApplications,
      eq(scheduledMessages.applicationId, programApplications.id),
    )
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .$dynamic();

  allowedQuery =
    conditions.length === 1
      ? allowedQuery.where(conditions[0])
      : allowedQuery.where(and(...conditions));

  const allowedRows = await allowedQuery;
  const allowedIds = allowedRows.map((row) => row.id);
  if (allowedIds.length === 0) return 0;

  const deletedRows = await getDb()
    .delete(scheduledMessages)
    .where(
      and(
        inArray(scheduledMessages.id, allowedIds),
        eq(scheduledMessages.deliveryStatus, "draft"),
      ),
    )
    .returning({ id: scheduledMessages.id });

  return deletedRows.length;
}

export async function markHostScheduledMessagesSent(
  messageIds: string[],
  options: {
    actorEmail?: string;
    memo?: string;
    result?: string;
    senderPhone?: string;
    villageIds?: string[];
  } = {},
): Promise<MarkHostScheduledMessagesSentResult> {
  const normalizedIds = Array.from(
    new Set(messageIds.map((id) => id.trim()).filter(isUuid)),
  );
  if (normalizedIds.length === 0) {
    return {
      sheetSync: { message: "No valid message ids.", status: "skipped" },
      updatedCount: 0,
    };
  }
  if (options.villageIds && options.villageIds.length === 0) {
    return {
      sheetSync: { message: "No manageable channel scope.", status: "skipped" },
      updatedCount: 0,
    };
  }

  const conditions: SQL[] = [
    inArray(scheduledMessages.id, normalizedIds),
    inArray(scheduledMessages.deliveryStatus, ["draft", "scheduled"]),
  ];
  if (options.villageIds) {
    conditions.push(inArray(programsTable.villageId, options.villageIds));
  }

  let allowedQuery = getDb()
    .select({
      id: scheduledMessages.id,
    })
    .from(scheduledMessages)
    .leftJoin(
      programApplications,
      eq(scheduledMessages.applicationId, programApplications.id),
    )
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .$dynamic();

  allowedQuery =
    conditions.length === 1
      ? allowedQuery.where(conditions[0])
      : allowedQuery.where(and(...conditions));

  const allowedRows = await allowedQuery;
  const allowedIds = allowedRows.map((row) => row.id);
  if (allowedIds.length === 0) {
    return {
      sheetSync: { message: "No scheduled messages were found.", status: "skipped" },
      updatedCount: 0,
    };
  }

  const sentAt = new Date();
  const updatedRows = await getDb()
    .update(scheduledMessages)
    .set({
      deliveryStatus: "sent",
      error: null,
      sentAt,
      updatedAt: sentAt,
    })
    .where(
      and(
        inArray(scheduledMessages.id, allowedIds),
        inArray(scheduledMessages.deliveryStatus, ["draft", "scheduled"]),
      ),
    )
    .returning({ id: scheduledMessages.id });

  const sheetSync = await markManualDispatchRowsSent({
    actorEmail: options.actorEmail,
    memo: options.memo,
    messageIds: updatedRows.map((row) => row.id),
    result: options.result,
    senderPhone: options.senderPhone,
    sentAt,
  });

  return {
    sheetSync,
    updatedCount: updatedRows.length,
  };
}

export async function processDueScheduledSmsMessages(
  options: { limit?: number } = {},
): Promise<{ failed: number; processed: number; retried: number; sent: number }> {
  if (process.env.SMS_AUTO_DELIVERY_ENABLED !== "true") {
    return { failed: 0, processed: 0, retried: 0, sent: 0 };
  }

  const readiness = getSmsDeliveryReadiness();
  if (!readiness.configured || !readiness.productionSafe) {
    throw new Error(readiness.detail);
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const now = new Date();
  const staleProcessingBefore = new Date(now.getTime() - 30 * 60 * 1000);

  const rows = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('nuvio:process-scheduled-sms'))`,
    );

    await tx
      .update(scheduledMessages)
      .set({
        claimedAt: null,
        claimToken: null,
        deliveryStatus: "scheduled",
        error: "Recovered stale SMS processing claim.",
        nextAttemptAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(scheduledMessages.channel, "sms"),
          eq(scheduledMessages.deliveryStatus, "processing"),
          lte(scheduledMessages.updatedAt, staleProcessingBefore),
        ),
      );

    const dueRows = await tx
      .select({
        body: scheduledMessages.body,
        id: scheduledMessages.id,
        recipient: scheduledMessages.recipient,
      })
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.channel, "sms"),
          eq(scheduledMessages.deliveryStatus, "scheduled"),
          or(
            isNull(scheduledMessages.scheduledFor),
            lte(scheduledMessages.scheduledFor, now),
          ),
          or(
            isNull(scheduledMessages.nextAttemptAt),
            lte(scheduledMessages.nextAttemptAt, now),
          ),
        ),
      )
      .orderBy(asc(scheduledMessages.scheduledFor))
      .limit(limit);

    const ids = dueRows.map((row) => row.id);
    if (ids.length === 0) return [];

    return tx
      .update(scheduledMessages)
      .set({
        attemptCount: sql`${scheduledMessages.attemptCount} + 1`,
        claimedAt: now,
        claimToken: sql`gen_random_uuid()`,
        deliveryStatus: "processing",
        error: null,
        lastAttemptAt: now,
        nextAttemptAt: null,
        updatedAt: now,
      })
      .where(
        and(
          inArray(scheduledMessages.id, ids),
          eq(scheduledMessages.deliveryStatus, "scheduled"),
        ),
      )
      .returning({
        attemptCount: scheduledMessages.attemptCount,
        body: scheduledMessages.body,
        claimToken: scheduledMessages.claimToken,
        id: scheduledMessages.id,
        maxAttempts: scheduledMessages.maxAttempts,
        recipient: scheduledMessages.recipient,
      });
  });

  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const row of rows) {
    try {
      const delivery = await sendSmsMessage({
        body: row.body,
        idempotencyKey: row.id,
        to: row.recipient,
      });
      const [updated] = await getDb()
        .update(scheduledMessages)
        .set({
          claimedAt: null,
          claimToken: null,
          deliveryStatus: "sent",
          error: null,
          nextAttemptAt: null,
          providerMessageId: delivery.providerMessageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scheduledMessages.id, row.id),
            eq(scheduledMessages.deliveryStatus, "processing"),
            eq(scheduledMessages.claimToken, row.claimToken!),
          ),
        )
        .returning({ id: scheduledMessages.id });
      if (updated) sent += 1;
    } catch {
      const terminal = row.attemptCount >= row.maxAttempts;
      const nextAttemptAt = terminal
        ? null
        : getNextScheduledMessageAttemptAt(row.attemptCount, new Date());
      const [updated] = await getDb()
        .update(scheduledMessages)
        .set({
          claimedAt: null,
          claimToken: null,
          deliveryStatus: terminal ? "failed" : "scheduled",
          error: terminal
            ? "SMS delivery failed after the maximum number of attempts."
            : `SMS delivery will retry at ${nextAttemptAt?.toISOString()}.`,
          nextAttemptAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scheduledMessages.id, row.id),
            eq(scheduledMessages.deliveryStatus, "processing"),
            eq(scheduledMessages.claimToken, row.claimToken!),
          ),
        )
        .returning({ id: scheduledMessages.id });
      if (updated) {
        failed += 1;
        if (!terminal) retried += 1;
      }
    }
  }

  return { failed, processed: rows.length, retried, sent };
}

export function getNextScheduledMessageAttemptAt(
  attemptCount: number,
  now: Date,
): Date {
  const baseDelayMs = 5 * 60 * 1000;
  const maxDelayMs = 6 * 60 * 60 * 1000;
  const delayMs = Math.min(
    baseDelayMs * 2 ** Math.max(attemptCount - 1, 0),
    maxDelayMs,
  );
  return new Date(now.getTime() + delayMs);
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
