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
import { ensureProgramRecord } from "@/lib/program-db";

export type ProgramApplicationInput = {
  programId: number;
  applicantName: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  memo?: string;
};

export async function createProgramApplication(
  input: ProgramApplicationInput,
): Promise<HostApplication> {
  const program = programs.find((item) => item.id === input.programId);

  if (!program) {
    throw new Error(`Program ${input.programId} was not found.`);
  }

  const programUuid = await ensureProgramRecord(program);
  const [row] = await getDb()
    .insert(programApplications)
    .values({
      programId: programUuid,
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
