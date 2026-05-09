import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applicationStatusEvents,
  programApplications,
  programs as programsTable,
} from "@/db/schema";
import { programs } from "@/lib/data";
import type {
  HostApplication,
  HostApplicationStatus,
} from "@/lib/host-operations";
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

export async function listHostApplications(): Promise<HostApplication[]> {
  const rows = await getDb()
    .select({
      id: programApplications.id,
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
    .orderBy(desc(programApplications.submittedAt))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    programTitle: row.programTitle ?? "NUVIO 프로그램",
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

export async function getHostApplicationDetail(
  applicationId: string,
): Promise<HostApplicationDetail | null> {
  const [row] = await getDb()
    .select({
      id: programApplications.id,
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
    .where(eq(programApplications.id, applicationId))
    .limit(1);

  if (!row) {
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
    programTitle: row.programTitle ?? "NUVIO 프로그램",
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
) {
  const [current] = await getDb()
    .select({ status: programApplications.status })
    .from(programApplications)
    .where(eq(programApplications.id, applicationId))
    .limit(1);

  if (!current) return;

  await getDb()
    .update(programApplications)
    .set({ status, updatedAt: new Date() })
    .where(eq(programApplications.id, applicationId));

  await getDb().insert(applicationStatusEvents).values({
    applicationId,
    fromStatus: current.status,
    toStatus: status,
    note: "Updated from NUVIO host console",
  });
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
