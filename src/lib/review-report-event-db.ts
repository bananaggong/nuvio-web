import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewReportEvents,
  reviewReports,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";

export type ReviewReportEventAction =
  | "created"
  | "updated"
  | "marked_reviewing"
  | "resolved"
  | "dismissed"
  | "reopened"
  | "reason_changed"
  | "status_changed";

export type ReviewReportEventStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type ReviewReportEventReason =
  | "inappropriate"
  | "privacy"
  | "spam"
  | "false_information"
  | "other";

export type ReviewReportEvent = {
  action: ReviewReportEventAction;
  actorRole?: string;
  createdAt: string;
  fromStatus?: ReviewReportEventStatus;
  id: string;
  message?: string;
  metadata: Record<string, unknown>;
  reason: ReviewReportEventReason;
  reportId: string;
  resolutionNote?: string;
  reviewId: string;
  toStatus: ReviewReportEventStatus;
};

type ReviewReportEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewReportForEvent = {
  id: string;
  programVillageId: string | null;
  reason: ReviewReportEventReason;
  reviewId: string;
  status: ReviewReportEventStatus;
  villageSlug: string | null;
};

type RecordReviewReportEventInput = {
  action?: ReviewReportEventAction;
  actorId?: string;
  actorRole?: string;
  fromStatus?: ReviewReportEventStatus | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  reason: ReviewReportEventReason;
  reportId: string;
  resolutionNote?: string | null;
  reviewId: string;
  toStatus: ReviewReportEventStatus;
};

const reportStatuses: ReviewReportEventStatus[] = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
];

const reportReasons: ReviewReportEventReason[] = [
  "inappropriate",
  "privacy",
  "spam",
  "false_information",
  "other",
];

const reportEventActions: ReviewReportEventAction[] = [
  "created",
  "updated",
  "marked_reviewing",
  "resolved",
  "dismissed",
  "reopened",
  "reason_changed",
  "status_changed",
];

export class ReviewReportEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review report event.");
    this.name = "ReviewReportEventAccessError";
  }
}

export class ReviewReportEventError extends Error {
  constructor(message = "Review report event is not available.") {
    super(message);
    this.name = "ReviewReportEventError";
  }
}

export async function listHostReviewReportEventsFromDb(
  reportId: string,
  options: ReviewReportEventAccessOptions & { limit?: number } = {},
): Promise<ReviewReportEvent[]> {
  const report = await getReviewReportForEvent(reportId);
  if (!report) throw new ReviewReportEventError("Review report was not found.");
  assertAccess(report, options);

  const rows = await getDb()
    .select()
    .from(reviewReportEvents)
    .where(eq(reviewReportEvents.reportId, reportId))
    .orderBy(desc(reviewReportEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapReportEvent);
}

export async function recordReviewReportEvent(
  input: RecordReviewReportEventInput,
  options: ReviewReportEventAccessOptions = {},
): Promise<ReviewReportEvent> {
  const report = await getReviewReportForEvent(input.reportId);
  if (!report) throw new ReviewReportEventError("Review report was not found.");
  if (report.reviewId !== input.reviewId) {
    throw new ReviewReportEventError("Review report was not found.");
  }
  assertAccess(report, options);

  const action = input.action ?? getReviewReportEventAction(input.fromStatus ?? null, input.toStatus);
  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = await findRecentTriggerEvent({
    action,
    fromStatus: input.fromStatus ?? null,
    reportId: input.reportId,
    toStatus: input.toStatus,
  });

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewReportEvents)
        .set({
          actorId,
          actorRole,
          metadata: {
            ...asRecord(recentTriggerEvent.metadata),
            ...metadata,
            enrichedBy: "application_service",
          },
        })
        .where(eq(reviewReportEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.report_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_report_event",
        metadata: {
          eventAction: updated.action,
          reportId: updated.reportId,
          reviewId: updated.reviewId,
          toStatus: updated.toStatus,
        },
      });
      return mapReportEvent(updated);
    }
  }

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewReportEvents)
      .values({
        action,
        actorId,
        actorRole,
        fromStatus: input.fromStatus ?? null,
        message: normalizeOptionalText(input.message),
        metadata,
        reason: input.reason,
        reportId: input.reportId,
        resolutionNote: normalizeOptionalText(input.resolutionNote),
        reviewId: input.reviewId,
        toStatus: input.toStatus,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.report_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_report_event",
    metadata: {
      eventAction: row.action,
      reportId: row.reportId,
      reviewId: row.reviewId,
      toStatus: row.toStatus,
    },
  });

  return mapReportEvent(row);
}

export async function safeRecordReviewReportEvent(
  input: RecordReviewReportEventInput,
  options: ReviewReportEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewReportEvent(input, options);
  } catch {
    // Report event logging should never break the primary review report action.
  }
}

export function getReviewReportEventAction(
  fromStatus: ReviewReportEventStatus | null | undefined,
  toStatus: ReviewReportEventStatus,
): ReviewReportEventAction {
  if (!fromStatus) return "created";
  if (fromStatus !== toStatus && toStatus === "reviewing") return "marked_reviewing";
  if (fromStatus !== toStatus && toStatus === "resolved") return "resolved";
  if (fromStatus !== toStatus && toStatus === "dismissed") return "dismissed";
  if (fromStatus !== toStatus && toStatus === "open") return "reopened";
  if (fromStatus !== toStatus) return "status_changed";
  return "updated";
}

async function findRecentTriggerEvent(input: {
  action: ReviewReportEventAction;
  fromStatus: ReviewReportEventStatus | null;
  reportId: string;
  toStatus: ReviewReportEventStatus;
}) {
  const fromStatusPredicate = input.fromStatus
    ? eq(reviewReportEvents.fromStatus, input.fromStatus)
    : isNull(reviewReportEvents.fromStatus);
  const [row] = await getDb()
    .select()
    .from(reviewReportEvents)
    .where(
      and(
        eq(reviewReportEvents.reportId, input.reportId),
        fromStatusPredicate,
        eq(reviewReportEvents.toStatus, input.toStatus),
        eq(reviewReportEvents.action, input.action),
        isNull(reviewReportEvents.actorId),
        sql`${reviewReportEvents.metadata}->>'source' = 'database_trigger'`,
        gte(reviewReportEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewReportEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getReviewReportForEvent(
  reportId: string,
): Promise<ReviewReportForEvent | null> {
  if (!isUuid(reportId)) return null;

  const [row] = await getDb()
    .select({
      id: reviewReports.id,
      programVillageId: programsTable.villageId,
      reason: reviewReports.reason,
      reviewId: reviewReports.reviewId,
      status: reviewReports.status,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewReports)
    .innerJoin(reviewsTable, eq(reviewReports.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewReports.id, reportId))
    .limit(1);

  return row
    ? {
        id: row.id,
        programVillageId: row.programVillageId,
        reason: asReportReason(row.reason),
        reviewId: row.reviewId,
        status: asReportStatus(row.status),
        villageSlug: row.villageSlug,
      }
    : null;
}

function assertAccess(
  report: ReviewReportForEvent,
  options: ReviewReportEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (report.villageSlug && options.allowedVillageSlugs?.includes(report.villageSlug)) return;
  if (report.programVillageId && options.allowedVillageIds?.includes(report.programVillageId)) return;
  throw new ReviewReportEventAccessError();
}

function mapReportEvent(
  row: typeof reviewReportEvents.$inferSelect,
): ReviewReportEvent {
  return {
    action: asReportEventAction(row.action),
    actorRole: row.actorRole ?? undefined,
    createdAt: row.createdAt.toISOString(),
    fromStatus: row.fromStatus ? asReportStatus(row.fromStatus) : undefined,
    id: row.id,
    message: row.message ?? undefined,
    metadata: sanitizeReportEventMetadata(row.metadata),
    reason: asReportReason(row.reason),
    reportId: row.reportId,
    resolutionNote: row.resolutionNote ?? undefined,
    reviewId: row.reviewId,
    toStatus: asReportStatus(row.toStatus),
  };
}

function sanitizeReportEventMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  const safe: Record<string, unknown> = {};

  copyString(metadata, safe, "source");
  copyString(metadata, safe, "enrichedBy");
  copyString(metadata, safe, "trigger");
  copyString(metadata, safe, "previousStatus");
  copyString(metadata, safe, "status");
  copyString(metadata, safe, "reason");

  return safe;
}

function copyString(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  if (typeof source[key] === "string") target[key] = source[key];
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  return {
    ...metadata,
    source: typeof metadata.source === "string" ? metadata.source : "application_service",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : {};
}

function asReportStatus(value: string): ReviewReportEventStatus {
  return reportStatuses.includes(value as ReviewReportEventStatus)
    ? (value as ReviewReportEventStatus)
    : "open";
}

function asReportReason(value: string): ReviewReportEventReason {
  return reportReasons.includes(value as ReviewReportEventReason)
    ? (value as ReviewReportEventReason)
    : "other";
}

function asReportEventAction(value: string): ReviewReportEventAction {
  return reportEventActions.includes(value as ReviewReportEventAction)
    ? (value as ReviewReportEventAction)
    : "status_changed";
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : null;
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), 300);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}