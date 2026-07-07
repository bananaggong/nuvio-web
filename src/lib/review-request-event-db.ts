import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewRequestEvents,
  reviewRequests,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type { ReviewRequestStatus } from "@/lib/review-request-db";

export type ReviewRequestEventAction =
  | "created"
  | "requested"
  | "resent"
  | "sent"
  | "opened"
  | "completed"
  | "cancelled"
  | "expired"
  | "reopened"
  | "status_changed";

export type ReviewRequestEvent = {
  action: ReviewRequestEventAction;
  actorRole?: string;
  createdAt: string;
  fromStatus?: ReviewRequestStatus;
  id: string;
  metadata: Record<string, unknown>;
  note?: string;
  requestId: string;
  toStatus: ReviewRequestStatus;
};

type ReviewRequestEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewRequestForEvent = {
  id: string;
  programVillageId: string | null;
  status: ReviewRequestStatus;
  villageSlug: string | null;
};

type RecordReviewRequestEventInput = {
  action?: ReviewRequestEventAction;
  actorId?: string;
  actorRole?: string;
  fromStatus?: ReviewRequestStatus | null;
  metadata?: Record<string, unknown>;
  note?: string | null;
  requestId: string;
  toStatus: ReviewRequestStatus;
};

const reviewRequestStatuses: ReviewRequestStatus[] = [
  "pending",
  "sent",
  "opened",
  "completed",
  "cancelled",
  "expired",
];

const reviewRequestEventActions: ReviewRequestEventAction[] = [
  "created",
  "requested",
  "resent",
  "sent",
  "opened",
  "completed",
  "cancelled",
  "expired",
  "reopened",
  "status_changed",
];

export class ReviewRequestEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review request event.");
    this.name = "ReviewRequestEventAccessError";
  }
}

export class ReviewRequestEventError extends Error {
  constructor(message = "Review request event is not available.") {
    super(message);
    this.name = "ReviewRequestEventError";
  }
}

export async function listHostReviewRequestEventsFromDb(
  requestId: string,
  options: ReviewRequestEventAccessOptions & { limit?: number } = {},
): Promise<ReviewRequestEvent[]> {
  const request = await getReviewRequestForEvent(requestId);
  if (!request) throw new ReviewRequestEventError("Review request was not found.");
  assertAccess(request, options);

  const rows = await getDb()
    .select()
    .from(reviewRequestEvents)
    .where(eq(reviewRequestEvents.requestId, requestId))
    .orderBy(desc(reviewRequestEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapRequestEvent);
}

export async function recordReviewRequestEvent(
  input: RecordReviewRequestEventInput,
  options: ReviewRequestEventAccessOptions = {},
): Promise<ReviewRequestEvent> {
  const request = await getReviewRequestForEvent(input.requestId);
  if (!request) throw new ReviewRequestEventError("Review request was not found.");
  assertAccess(request, options);

  const action = input.action ?? getReviewRequestEventAction(input.fromStatus ?? null, input.toStatus);
  validateReviewRequestEventAction(action, input.fromStatus ?? null, input.toStatus);
  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = await findRecentTriggerEvent({
    action,
    fromStatus: input.fromStatus ?? null,
    requestId: input.requestId,
    toStatus: input.toStatus,
  });

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewRequestEvents)
        .set({
          actorId,
          actorRole,
          metadata: {
            ...asRecord(recentTriggerEvent.metadata),
            ...metadata,
            enrichedBy: "application_service",
          },
          note: normalizeOptionalText(input.note) ?? recentTriggerEvent.note,
        })
        .where(eq(reviewRequestEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.request_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_request_event",
        metadata: {
          eventAction: updated.action,
          requestId: updated.requestId,
          toStatus: updated.toStatus,
        },
      });
      return mapRequestEvent(updated);
    }
  }

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewRequestEvents)
      .values({
        action,
        actorId,
        actorRole,
        fromStatus: input.fromStatus ?? null,
        metadata,
        note: normalizeOptionalText(input.note),
        requestId: input.requestId,
        toStatus: input.toStatus,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.request_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_request_event",
    metadata: {
      eventAction: row.action,
      requestId: row.requestId,
      toStatus: row.toStatus,
    },
  });

  return mapRequestEvent(row);
}

export async function safeRecordReviewRequestEvent(
  input: RecordReviewRequestEventInput,
  options: ReviewRequestEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewRequestEvent(input, options);
  } catch {
    // Request event logging should never break the primary review request action.
  }
}

export function getReviewRequestEventAction(
  fromStatus: ReviewRequestStatus | null | undefined,
  toStatus: ReviewRequestStatus,
): ReviewRequestEventAction {
  if (!fromStatus) {
    if (toStatus === "sent") return "requested";
    if (toStatus === "completed") return "completed";
    if (toStatus === "opened") return "opened";
    if (toStatus === "cancelled") return "cancelled";
    if (toStatus === "expired") return "expired";
    return "created";
  }
  if (fromStatus === "completed" && toStatus !== "completed") return "reopened";
  if (toStatus === "sent") return "sent";
  if (toStatus === "opened") return "opened";
  if (toStatus === "completed") return "completed";
  if (toStatus === "cancelled") return "cancelled";
  if (toStatus === "expired") return "expired";
  if (toStatus === "pending" && (fromStatus === "cancelled" || fromStatus === "expired")) {
    return "reopened";
  }
  return "status_changed";
}

function validateReviewRequestEventAction(
  action: ReviewRequestEventAction,
  fromStatus: ReviewRequestStatus | null,
  toStatus: ReviewRequestStatus,
): void {
  if (!fromStatus) {
    if (toStatus === "pending" && action === "created") return;
    if (toStatus === "sent" && (action === "requested" || action === "resent")) return;
    if (toStatus === "opened" && action === "opened") return;
    if (toStatus === "completed" && action === "completed") return;
    if (toStatus === "cancelled" && action === "cancelled") return;
    if (toStatus === "expired" && action === "expired") return;
    throw new ReviewRequestEventError(
      "Review request event action does not match the status transition.",
    );
  }

  if (fromStatus === toStatus) {
    if (action === "resent" || action === "status_changed") return;
    throw new ReviewRequestEventError(
      "Review request event action does not match the status transition.",
    );
  }

  if (fromStatus === "completed" && toStatus !== "completed" && action === "reopened") return;
  if (
    (fromStatus === "cancelled" || fromStatus === "expired") &&
    toStatus === "pending" &&
    action === "reopened"
  ) {
    return;
  }
  if (
    toStatus === "sent" &&
    (action === "requested" || action === "sent" || action === "resent")
  ) {
    return;
  }
  if (toStatus === "opened" && action === "opened") return;
  if (toStatus === "completed" && action === "completed") return;
  if (toStatus === "cancelled" && action === "cancelled") return;
  if (toStatus === "expired" && action === "expired") return;

  throw new ReviewRequestEventError(
    "Review request event action does not match the status transition.",
  );
}

async function findRecentTriggerEvent(input: {
  action: ReviewRequestEventAction;
  fromStatus: ReviewRequestStatus | null;
  requestId: string;
  toStatus: ReviewRequestStatus;
}) {
  const fromStatusPredicate = input.fromStatus
    ? eq(reviewRequestEvents.fromStatus, input.fromStatus)
    : isNull(reviewRequestEvents.fromStatus);
  const [row] = await getDb()
    .select()
    .from(reviewRequestEvents)
    .where(
      and(
        eq(reviewRequestEvents.requestId, input.requestId),
        fromStatusPredicate,
        eq(reviewRequestEvents.toStatus, input.toStatus),
        eq(reviewRequestEvents.action, input.action),
        isNull(reviewRequestEvents.actorId),
        isNull(reviewRequestEvents.actorRole),
        sql`${reviewRequestEvents.metadata}->>'source' = 'database_trigger'`,
        sql`not (${reviewRequestEvents.metadata} ? 'enrichedBy')`,
        gte(reviewRequestEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewRequestEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getReviewRequestForEvent(
  requestId: string,
): Promise<ReviewRequestForEvent | null> {
  if (!isUuid(requestId)) return null;

  const [row] = await getDb()
    .select({
      id: reviewRequests.id,
      programVillageId: programsTable.villageId,
      status: reviewRequests.status,
      villageSlug: reviewRequests.villageSlug,
    })
    .from(reviewRequests)
    .leftJoin(programsTable, eq(reviewRequests.programId, programsTable.id))
    .where(eq(reviewRequests.id, requestId))
    .limit(1);

  return row
    ? {
        id: row.id,
        programVillageId: row.programVillageId,
        status: asReviewRequestStatus(row.status),
        villageSlug: row.villageSlug,
      }
    : null;
}

function assertAccess(
  request: ReviewRequestForEvent,
  options: ReviewRequestEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (request.villageSlug && options.allowedVillageSlugs?.includes(request.villageSlug)) return;
  if (request.programVillageId && options.allowedVillageIds?.includes(request.programVillageId)) return;
  throw new ReviewRequestEventAccessError();
}

function mapRequestEvent(
  row: typeof reviewRequestEvents.$inferSelect,
): ReviewRequestEvent {
  return {
    action: asReviewRequestEventAction(row.action),
    actorRole: row.actorRole ?? undefined,
    createdAt: row.createdAt.toISOString(),
    fromStatus: row.fromStatus ? asReviewRequestStatus(row.fromStatus) : undefined,
    id: row.id,
    metadata: sanitizeRequestEventMetadata(row.metadata),
    note: row.note ?? undefined,
    requestId: row.requestId,
    toStatus: asReviewRequestStatus(row.toStatus),
  };
}

function sanitizeRequestEventMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  const safe: Record<string, unknown> = {};

  copyString(metadata, safe, "source");
  copyString(metadata, safe, "enrichedBy");
  copyString(metadata, safe, "reason");
  copyString(metadata, safe, "applicationStatus");
  copyString(metadata, safe, "status");
  copyString(metadata, safe, "previousStatus");
  copyNumber(metadata, safe, "requestCount");
  copyNumber(metadata, safe, "previousRequestCount");

  return safe;
}

function copyString(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  if (typeof source[key] === "string") target[key] = source[key];
}

function copyNumber(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) target[key] = value;
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

function asReviewRequestStatus(value: string): ReviewRequestStatus {
  return reviewRequestStatuses.includes(value as ReviewRequestStatus)
    ? (value as ReviewRequestStatus)
    : "pending";
}

function asReviewRequestEventAction(value: string): ReviewRequestEventAction {
  return reviewRequestEventActions.includes(value as ReviewRequestEventAction)
    ? (value as ReviewRequestEventAction)
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
