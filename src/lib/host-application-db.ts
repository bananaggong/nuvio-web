import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applicationStatusEvents,
  programApplications,
  programRuns,
  programs as programsTable,
} from "@/db/schema";
import { getApplicationFormSnapshotForSubmission } from "@/lib/application-form-db";
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
import { ensureDefaultProgramRunForProgram } from "@/lib/program-run-db";

export type ProgramApplicationInput = {
  programId: number | string;
  programRunId?: string;
  formId?: string;
  applicantName: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  memo?: string;
  submittedBy?: string;
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
  submittedByUserId?: string;
  villageIds?: string[];
};

export type HostApplicationAccessOptions = {
  villageIds?: string[];
};

export class DuplicateProgramApplicationError extends Error {
  constructor() {
    super("Program application already exists.");
    this.name = "DuplicateProgramApplicationError";
  }
}

export async function createProgramApplication(
  input: ProgramApplicationInput,
): Promise<HostApplication> {
  const program = await resolveApplicationProgram(input.programId);
  const email = input.email.trim().toLowerCase();
  const formId = isUuid(input.formId ?? "") ? input.formId : undefined;
  const programRunId = isUuid(input.programRunId ?? "")
    ? input.programRunId
    : await ensureDefaultProgramRunForProgram(program.id);
  const formSnapshot = await getApplicationFormSnapshotForSubmission({
    formId,
    programId: program.id,
    programTitle: program.title,
  });
  const consentSnapshot = buildConsentSnapshot(input.answers);

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`program-application:${program.id}:${email}`}))`,
    );

    const [existingApplication] = await tx
      .select({ id: programApplications.id })
      .from(programApplications)
      .where(
        sql`${programApplications.programId} = ${program.id} and lower(${programApplications.email}) = ${email}`,
      )
      .limit(1);

    if (existingApplication) {
      throw new DuplicateProgramApplicationError();
    }

    return tx
      .insert(programApplications)
      .values({
        programId: program.id,
        programRunId: programRunId ?? null,
        formId: formId ?? null,
        applicantName: input.applicantName,
        email,
        phone: input.phone,
        submittedBy: isUuid(input.submittedBy ?? "") ? input.submittedBy : null,
        answers: input.answers,
        consentSnapshot,
        formSnapshot,
        status: "submitted",
        paymentAmount: 0,
        receiptCount: 0,
        signatureCompleted: false,
        reviewSubmitted: false,
      })
      .returning({
        id: programApplications.id,
        programRunId: programApplications.programRunId,
        status: programApplications.status,
        submittedAt: programApplications.submittedAt,
        paymentAmount: programApplications.paymentAmount,
        receiptCount: programApplications.receiptCount,
        signatureCompleted: programApplications.signatureCompleted,
        reviewSubmitted: programApplications.reviewSubmitted,
      });
  });

  return {
    answers: input.answers,
    consentSnapshot: consentSnapshot ?? undefined,
    formId,
    formSnapshot: formSnapshot ?? undefined,
    id: row.id,
    programId: program.id,
    programCreatedBy: program.createdBy ?? undefined,
    programRunId: row.programRunId ?? undefined,
    programTitle: program.title,
    villageId: program.villageId ?? undefined,
    applicantName: input.applicantName,
    email,
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

export type ExistingProgramApplication = Pick<
  HostApplication,
  "id" | "programId" | "programTitle" | "status" | "submittedAt"
>;

export async function findExistingProgramApplication(input: {
  emails: string[];
  programId: number | string;
}): Promise<ExistingProgramApplication | null> {
  const emails = normalizeEmailList(input.emails);
  if (emails.length === 0) return null;

  const program = await resolveApplicationProgram(input.programId);
  const [row] = await getDb()
    .select({
      id: programApplications.id,
      status: programApplications.status,
      submittedAt: programApplications.submittedAt,
    })
    .from(programApplications)
    .where(
      and(
        eq(programApplications.programId, program.id),
        inArray(sql<string>`lower(${programApplications.email})`, emails),
      ),
    )
    .orderBy(desc(programApplications.submittedAt))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    programId: program.id,
    programTitle: program.title,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
  };
}

async function resolveApplicationProgram(
  programId: number | string,
): Promise<{ createdBy?: string | null; id: string; title: string; villageId?: string | null }> {
  const key = String(programId).trim();
  const numericId = Number(key);
  const staticProgram = Number.isInteger(numericId)
    ? programs.find((item) => item.id === numericId)
    : undefined;

  if (staticProgram) {
    return {
      id: await ensureProgramRecord(staticProgram),
      title: staticProgram.title,
      createdBy: null,
      villageId: null,
    };
  }

  const programRecord = await getProgramRecordByIdentifier(key);
  if (programRecord) {
    return {
      createdBy: programRecord.createdBy,
      id: programRecord.id,
      title: programRecord.title,
      villageId: programRecord.villageId,
    };
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

  const ownerConditions: SQL[] = [];
  if (options.submittedByUserId) {
    ownerConditions.push(
      eq(programApplications.submittedBy, options.submittedByUserId),
    );
  }
  if (options.emails) {
    ownerConditions.push(inArray(sql<string>`lower(${programApplications.email})`, emails));
  }
  if (ownerConditions.length === 1) {
    conditions.push(ownerConditions[0]);
  } else if (ownerConditions.length > 1) {
    const ownerCondition = or(...ownerConditions);
    if (ownerCondition) conditions.push(ownerCondition);
  }

  let query = getDb()
    .select({
      id: programApplications.id,
      formId: programApplications.formId,
      formSnapshot: programApplications.formSnapshot,
      consentSnapshot: programApplications.consentSnapshot,
      programId: programApplications.programId,
      programRunId: programApplications.programRunId,
      programRunTitle: programRuns.title,
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
    .leftJoin(programRuns, eq(programApplications.programRunId, programRuns.id))
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
    answers: row.answers,
    consentSnapshot: row.consentSnapshot ?? undefined,
    formId: row.formId ?? undefined,
    formSnapshot: row.formSnapshot ?? undefined,
    programId: row.programId,
    programRunId: row.programRunId ?? undefined,
    programRunTitle: row.programRunTitle ?? undefined,
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
      formId: programApplications.formId,
      formSnapshot: programApplications.formSnapshot,
      consentSnapshot: programApplications.consentSnapshot,
      programId: programApplications.programId,
      programRunId: programApplications.programRunId,
      programRunTitle: programRuns.title,
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
    .leftJoin(programRuns, eq(programApplications.programRunId, programRuns.id))
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
    formId: row.formId ?? undefined,
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
    consentSnapshot: row.consentSnapshot ?? undefined,
    formSnapshot: row.formSnapshot ?? undefined,
    programRunId: row.programRunId ?? undefined,
    programRunTitle: row.programRunTitle ?? undefined,
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

  if (current.status === status) {
    return true;
  }

  await getDb().transaction(async (tx) => {
    await tx
      .update(programApplications)
      .set({ status, updatedAt: new Date() })
      .where(eq(programApplications.id, applicationId));

    await tx.insert(applicationStatusEvents).values({
      actorId: isUuid(actorId ?? "") ? actorId : null,
      applicationId,
      fromStatus: current.status,
      toStatus: status,
      note: "Updated from host console",
    });
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

function buildConsentSnapshot(
  answers: Record<string, unknown>,
): Record<string, unknown> | null {
  const legalConsent = answers.legalConsent;
  if (!legalConsent || typeof legalConsent !== "object" || Array.isArray(legalConsent)) {
    return null;
  }

  return {
    capturedAt: new Date().toISOString(),
    consent: legalConsent,
    snapshotVersion: 1,
    source: "answers.legalConsent",
  };
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
