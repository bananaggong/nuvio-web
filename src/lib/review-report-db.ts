import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewReports,
  reviews as reviewsTable,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { buildPublicReviewVisibilityConditions } from "@/lib/review-public-visibility-db";
import { safeRecordReviewReportEvent } from "@/lib/review-report-event-db";
import { safeReleaseReviewVisibilityHoldsBySourceFromDb } from "@/lib/review-visibility-hold-db";

export type ReviewReportReason =
  | "inappropriate"
  | "privacy"
  | "spam"
  | "false_information"
  | "other";

export type ReviewReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type ReviewReport = {
  id: string;
  reviewId: string;
  reviewTitle: string;
  villageSlug?: string;
  programId?: string;
  reporterEmail: string;
  reason: ReviewReportReason;
  message: string;
  status: ReviewReportStatus;
  resolutionNote: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

type ReviewReportRow = typeof reviewReports.$inferSelect;
type ReviewReportInsert = typeof reviewReports.$inferInsert;

const reportReasons: ReviewReportReason[] = [
  "inappropriate",
  "privacy",
  "spam",
  "false_information",
  "other",
];
const reportStatuses: ReviewReportStatus[] = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
];

export class DuplicateReviewReportError extends Error {
  constructor() {
    super("You have already reported this review.");
    this.name = "DuplicateReviewReportError";
  }
}

export class ReviewReportAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review report.");
    this.name = "ReviewReportAccessError";
  }
}

export class ReviewReportSelfReportError extends Error {
  constructor() {
    super("You cannot report your own review.");
    this.name = "ReviewReportSelfReportError";
  }
}

export async function createReviewReport(
  input: unknown,
  auth: ApiAuthContext,
): Promise<ReviewReport> {
  const normalized = normalizeCreateReviewReportInput(input);

  const [review] = await getDb()
    .select({
      id: reviewsTable.id,
      programId: reviewsTable.programId,
      title: reviewsTable.title,
      userId: reviewsTable.userId,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.id, normalized.reviewId), ...buildPublicReviewVisibilityConditions()))
    .limit(1);

  if (!review) {
    throw new Error("Published review was not found.");
  }
  if (review.userId === auth.user.id) {
    throw new ReviewReportSelfReportError();
  }

  const [row] = await getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: reviewReports.id })
      .from(reviewReports)
      .where(
        and(
          eq(reviewReports.reviewId, normalized.reviewId),
          eq(reviewReports.reporterId, auth.user.id),
        ),
      )
      .limit(1);

    if (existing) throw new DuplicateReviewReportError();

    return tx
      .insert(reviewReports)
      .values({
        reviewId: normalized.reviewId,
        reporterId: auth.user.id,
        reporterEmail: getPrimaryEmail(auth),
        reason: normalized.reason,
        message: normalized.message,
        status: "open",
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.report.create",
    actorId: auth.user.id,
    entityId: row.id,
    entityType: "review_report",
    metadata: {
      reason: row.reason,
      reviewId: row.reviewId,
    },
  });

  await safeRecordReviewReportEvent({
    actorId: auth.user.id,
    actorRole: auth.profile.role,
    message: row.message,
    metadata: { source: "application_service", trigger: "create_report" },
    reason: asReportReason(row.reason),
    reportId: row.id,
    resolutionNote: row.resolutionNote,
    reviewId: row.reviewId,
    toStatus: asReportStatus(row.status),
  });

  return mapReviewReportRow(row, review);
}

export async function listHostReviewReports(options: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  limit?: number;
} = {}): Promise<ReviewReport[]> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) return [];
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) return [];

  const conditions: SQL[] = [];
  const accessConditions: SQL[] = [];
  if (options.allowedVillageSlugs) {
    accessConditions.push(inArray(reviewsTable.villageSlug, options.allowedVillageSlugs));
  }
  if (options.allowedVillageIds) {
    accessConditions.push(inArray(programsTable.villageId, options.allowedVillageIds));
  }
  if (accessConditions.length === 1) conditions.push(accessConditions[0]);
  if (accessConditions.length > 1) {
    const accessPredicate = or(...accessConditions);
    if (accessPredicate) conditions.push(accessPredicate);
  }

  const baseQuery = getDb()
    .select({
      report: reviewReports,
      review: {
        id: reviewsTable.id,
        programId: reviewsTable.programId,
        title: reviewsTable.title,
        villageSlug: reviewsTable.villageSlug,
      },
    })
    .from(reviewReports)
    .innerJoin(reviewsTable, eq(reviewReports.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const rows = conditions.length > 0
    ? await baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(reviewReports.createdAt))
        .limit(clampLimit(options.limit, 100))
    : await baseQuery
        .orderBy(desc(reviewReports.createdAt))
        .limit(clampLimit(options.limit, 100));

  return rows.map(({ report, review }) => mapReviewReportRow(report, review));
}

export async function updateReviewReportStatus(
  input: unknown,
  options: {
    actorId: string;
    actorRole?: string;
    allowedVillageIds?: string[];
    allowedVillageSlugs?: string[];
  },
): Promise<ReviewReport> {
  const normalized = normalizeUpdateReviewReportInput(input);

  const [existing] = await getDb()
    .select({
      report: reviewReports,
      review: {
        id: reviewsTable.id,
        programId: reviewsTable.programId,
        title: reviewsTable.title,
        villageSlug: reviewsTable.villageSlug,
      },
      programVillageId: programsTable.villageId,
    })
    .from(reviewReports)
    .innerJoin(reviewsTable, eq(reviewReports.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewReports.id, normalized.id))
    .limit(1);

  if (!existing) throw new Error("Review report was not found.");
  assertReportAccess({
    allowedVillageIds: options.allowedVillageIds,
    allowedVillageSlugs: options.allowedVillageSlugs,
    programVillageId: existing.programVillageId ?? undefined,
    villageSlug: existing.review.villageSlug,
  });

  const now = new Date();
  const finalStatus = normalized.status === "resolved" || normalized.status === "dismissed";
  const updateValue: Partial<ReviewReportInsert> = {
    resolutionNote: finalStatus ? normalized.resolutionNote : null,
    resolvedAt: finalStatus ? existing.report.resolvedAt ?? now : null,
    resolvedBy: finalStatus ? existing.report.resolvedBy ?? options.actorId : null,
    status: normalized.status,
    updatedAt: now,
  };

  const [row] = await getDb()
    .update(reviewReports)
    .set(updateValue)
    .where(eq(reviewReports.id, normalized.id))
    .returning();

  void safeCreateAuditLog({
    action: "review.report.status.update",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review_report",
    metadata: {
      fromStatus: existing.report.status,
      status: row.status,
      reviewId: row.reviewId,
    },
  });

  const reportChanged = existing.report.status !== row.status
    || (existing.report.resolutionNote ?? null) !== (row.resolutionNote ?? null);
  if (reportChanged) {
    await safeRecordReviewReportEvent({
      actorId: options.actorId,
      actorRole: options.actorRole,
      fromStatus: asReportStatus(existing.report.status),
      message: row.message,
      metadata: {
        source: "application_service",
        trigger: "update_report_status",
        previousStatus: existing.report.status,
      },
      reason: asReportReason(row.reason),
      reportId: row.id,
      resolutionNote: row.resolutionNote,
      reviewId: row.reviewId,
      toStatus: asReportStatus(row.status),
    }, {
      actorId: options.actorId,
      actorRole: options.actorRole,
      allowedVillageIds: options.allowedVillageIds,
      allowedVillageSlugs: options.allowedVillageSlugs,
    });
  }

  if (row.status === "resolved" || row.status === "dismissed") {
    await safeReleaseReviewVisibilityHoldsBySourceFromDb({
      note: row.resolutionNote,
      releaseSource: `report_${row.status}`,
      reviewId: row.reviewId,
      sourceId: row.id,
      sourceType: "review_report",
    }, {
      actorId: options.actorId,
      actorRole: options.actorRole,
      allowedVillageIds: options.allowedVillageIds,
      allowedVillageSlugs: options.allowedVillageSlugs,
    });
  }

  return mapReviewReportRow(row, existing.review);
}

function normalizeCreateReviewReportInput(input: unknown): {
  message: string;
  reason: ReviewReportReason;
  reviewId: string;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Report payload is required.");
  }

  const value = input as Record<string, unknown>;
  const reviewId = asUuid(value.reviewId);
  if (!reviewId) throw new Error("A valid review id is required.");

  return {
    message: asString(value.message).slice(0, 1000),
    reason: asReportReason(value.reason),
    reviewId,
  };
}

function normalizeUpdateReviewReportInput(input: unknown): {
  id: string;
  resolutionNote: string | null;
  status: ReviewReportStatus;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Report payload is required.");
  }

  const value = input as Record<string, unknown>;
  const id = asUuid(value.id);
  if (!id) throw new Error("A valid report id is required.");

  return {
    id,
    resolutionNote: asString(value.resolutionNote).slice(0, 1000) || null,
    status: asReportStatus(value.status),
  };
}

function mapReviewReportRow(
  row: ReviewReportRow,
  review: { id: string; programId: string | null; title: string; villageSlug: string | null },
): ReviewReport {
  return {
    id: row.id,
    reviewId: row.reviewId,
    reviewTitle: review.title,
    villageSlug: review.villageSlug ?? undefined,
    programId: review.programId ?? undefined,
    reporterEmail: row.reporterEmail ?? "",
    reason: asReportReason(row.reason),
    message: row.message ?? "",
    status: asReportStatus(row.status),
    resolutionNote: row.resolutionNote ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
  };
}

function assertReportAccess(input: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  programVillageId?: string;
  villageSlug?: string | null;
}) {
  if (!input.allowedVillageIds && !input.allowedVillageSlugs) return;
  if (input.villageSlug && input.allowedVillageSlugs?.includes(input.villageSlug)) return;
  if (input.programVillageId && input.allowedVillageIds?.includes(input.programVillageId)) return;
  throw new ReviewReportAccessError();
}

function asReportReason(value: unknown): ReviewReportReason {
  const text = asString(value);
  return reportReasons.includes(text as ReviewReportReason)
    ? (text as ReviewReportReason)
    : "other";
}

function asReportStatus(value: unknown): ReviewReportStatus {
  const text = asString(value);
  return reportStatuses.includes(text as ReviewReportStatus)
    ? (text as ReviewReportStatus)
    : "open";
}

function getPrimaryEmail(auth: ApiAuthContext): string {
  return String(auth.user.email || auth.profile.email || "").trim().toLowerCase();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asUuid(value: unknown): string | undefined {
  const text = asString(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(text)
    ? text
    : undefined;
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), 300);
}