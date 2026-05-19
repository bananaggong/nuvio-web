import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applicationStatusEvents,
  programApplications,
  programs as programsTable,
} from "@/db/schema";
import { programs } from "@/lib/data";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type {
  HostApplication,
  HostApplicationStatus,
} from "@/lib/host-operations";
import { queueApplicationStatusNotification } from "@/lib/notification-db";
import {
  ensureProgramRecord,
  getProgramRecordByIdentifier,
} from "@/lib/program-db";

export type ProgramApplicationInput = {
  programId: number | string;
  formId?: string;
  applicantName: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  memo?: string;
};

export type HostApplicationStatusEvent = {
  id: string;
  fromStatus: HostApplicationStatus | null;
  toStatus: HostApplicationStatus;
  note: string | null;
  createdAt: string;
};

export type HostApplicationDetail = HostApplication & {
  answers: Record<string, unknown>;
  statusEvents: HostApplicationStatusEvent[];
};

export type ListHostApplicationsOptions = {
  emails?: string[];
  limit?: number;
  villageIds?: string[];
};

export type HostApplicationAccessOptions = {
  villageIds?: string[];
};

export async function createProgramApplication(
  input: ProgramApplicationInput,
): Promise<HostApplication> {
  const program = await resolveApplicationProgram(input.programId);
  const [row] = await getDb()
    .insert(programApplications)
    .values({
      programId: program.id,
      formId: isUuid(input.formId ?? "") ? input.formId : null,
      applicantName: input.applicantName,
      email: input.email,
      phone: input.phone,
      answers: input.answers,
      status: "submitted",
      paymentAmount: 0,
      receiptCount: 0,
      signatureCompleted: false,
      reviewSubmitted: false,
    })
    .returning({
      id: programApplications.id,
      status: programApplications.status,
      submittedAt: programApplications.submittedAt,
      paymentAmount: programApplications.paymentAmount,
      receiptCount: programApplications.receiptCount,
      signatureCompleted: programApplications.signatureCompleted,
      reviewSubmitted: programApplications.reviewSubmitted,
    });

  return {
    id: row.id,
    programId: program.id,
    programTitle: program.title,
    applicantName: input.applicantName,
    email: input.email,
    phone: input.phone,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    paymentAmount: row.paymentAmount,
    receiptCount: row.receiptCount,
    signatureCompleted: row.signatureCompleted,
    reviewSubmitted: row.reviewSubmitted,
    memo: input.memo ?? String(input.answers.motivation ?? "").slice(0, 72),
  };
}

async function resolveApplicationProgram(
  programId: number | string,
): Promise<{ id: string; title: string }> {
  const key = String(programId).trim();
  const numericId = Number(key);
  const staticProgram = Number.isInteger(numericId)
    ? programs.find((item) => item.id === numericId)
    : undefined;

  if (staticProgram) {
    return {
      id: await ensureProgramRecord(staticProgram),
      title: staticProgram.title,
    };
  }

  const programRecord = await getProgramRecordByIdentifier(key);
  if (programRecord) {
    return { id: programRecord.id, title: programRecord.title };
  }

  throw new Error(`Program ${key} was not found.`);
}

export async function listHostApplications(
  options: ListHostApplicationsOptions = {},
): Promise<HostApplication[]> {
  if (options.villageIds && options.villageIds.length === 0) return [];

  const emails = normalizeEmailList(options.emails);
  if (options.emails && emails.length === 0) return [];

  const conditions: SQL[] = [];
  if (options.villageIds) {
    conditions.push(inArray(programsTable.villageId, options.villageIds));
  }
  if (options.emails) {
    conditions.push(inArray(programApplications.email, emails));
  }

  let query = getDb()
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
    .$dynamic();

  if (conditions.length === 1) {
    query = query.where(conditions[0]);
  } else if (conditions.length > 1) {
    query = query.where(and(...conditions));
  }

  const rows = await query
    .orderBy(desc(programApplications.submittedAt))
    .limit(options.limit ?? 200);

  return rows.map((row) => ({
    id: row.id,
    programId: row.programId,
    programTitle: row.programTitle ?? "누비오 프로그램",
    applicantName: row.applicantName,
    email: row.email,
    phone: row.phone ?? "",
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    paymentAmount: row.paymentAmount,
    receiptCount: row.receiptCount,
    signatureCompleted: row.signatureCompleted,
    reviewSubmitted: row.reviewSubmitted,
    memo: extractMemo(row.answers),
  }));
}

function normalizeEmailList(emails: string[] | undefined): string[] {
  if (!emails) return [];

  return Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)),
    ),
  );
}

export async function getHostApplicationDetail(
  applicationId: string,
  options: HostApplicationAccessOptions = {},
): Promise<HostApplicationDetail | null> {
  if (options.villageIds && options.villageIds.length === 0) return null;

  const [row] = await getDb()
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
      villageId: programsTable.villageId,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .where(eq(programApplications.id, applicationId))
    .limit(1);

  if (!row) {
    return null;
  }
  if (options.villageIds && !options.villageIds.includes(row.villageId ?? "")) {
    return null;
  }

  const statusEvents = await getDb()
    .select({
      id: applicationStatusEvents.id,
      fromStatus: applicationStatusEvents.fromStatus,
      toStatus: applicationStatusEvents.toStatus,
      note: applicationStatusEvents.note,
      createdAt: applicationStatusEvents.createdAt,
    })
    .from(applicationStatusEvents)
    .where(eq(applicationStatusEvents.applicationId, applicationId))
    .orderBy(desc(applicationStatusEvents.createdAt))
    .limit(50);

  return {
    id: row.id,
    programId: row.programId,
    programTitle: row.programTitle ?? "누비오 프로그램",
    applicantName: row.applicantName,
    email: row.email,
    phone: row.phone ?? "",
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    paymentAmount: row.paymentAmount,
    receiptCount: row.receiptCount,
    signatureCompleted: row.signatureCompleted,
    reviewSubmitted: row.reviewSubmitted,
    memo: extractMemo(row.answers),
    answers: row.answers,
    statusEvents: statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function updateHostApplicationStatus(
  applicationId: string,
  status: HostApplicationStatus,
  actorId?: string,
  options: HostApplicationAccessOptions = {},
): Promise<boolean> {
  if (options.villageIds && options.villageIds.length === 0) return false;

  const [current] = await getDb()
    .select({
      email: programApplications.email,
      programTitle: programsTable.title,
      status: programApplications.status,
      villageId: programsTable.villageId,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .where(eq(programApplications.id, applicationId))
    .limit(1);

  if (!current) return false;
  if (
    options.villageIds &&
    !options.villageIds.includes(current.villageId ?? "")
  ) {
    return false;
  }

  await getDb()
    .update(programApplications)
    .set({ status, updatedAt: new Date() })
    .where(eq(programApplications.id, applicationId));

  await getDb().insert(applicationStatusEvents).values({
    applicationId,
    fromStatus: current.status,
    toStatus: status,
    note: "Updated from 누비오 host console",
  });

  void queueApplicationStatusNotification({
    applicationId,
    email: current.email,
    fromStatus: current.status,
    programTitle: current.programTitle ?? "누비오 프로그램",
    status,
  }).catch(() => undefined);

  void safeCreateAuditLog({
    action: "application.status.update",
    actorId,
    entityId: applicationId,
    entityType: "program_application",
    metadata: {
      fromStatus: current.status,
      programTitle: current.programTitle ?? "누비오 프로그램",
      status,
    },
  });

  return true;
}

function extractMemo(answers: Record<string, unknown>): string {
  const memo =
    answers.memo ??
    answers.motivation ??
    answers.receiptPlan ??
    answers.workStyle ??
    "";

  return String(memo).slice(0, 72);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
