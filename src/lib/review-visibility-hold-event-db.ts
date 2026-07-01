import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewVisibilityHoldEvents,
  reviewVisibilityHolds,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type {
  ReviewVisibilityHoldReason,
  ReviewVisibilityHoldSourceType,
  ReviewVisibilityHoldStatus,
} from "@/lib/review-visibility-hold-db";

export type ReviewVisibilityHoldEventAction =
  | "created"
  | "activated"
  | "released"
  | "reactivated"
  | "updated"
  | "metadata_changed"
  | "status_changed";

export type ReviewVisibilityHoldEvent = {
  action: ReviewVisibilityHoldEventAction;
  actorId?: string;
  actorRole?: string;
  createdAt: string;
  fromStatus?: ReviewVisibilityHoldStatus;
  holdId: string;
  id: string;
  metadata: Record<string, unknown>;
  note?: string;
  reason: ReviewVisibilityHoldReason;
  reviewId: string;
  sourceId?: string;
  sourceType: ReviewVisibilityHoldSourceType;
  toStatus: ReviewVisibilityHoldStatus;
};

type ReviewVisibilityHoldEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  expectedReviewId?: string;
};

type ReviewVisibilityHoldForEvent = {
  id: string;
  programVillageId: string | null;
  reason: ReviewVisibilityHoldReason;
  reviewId: string;
  sourceId: string | null;
  sourceType: ReviewVisibilityHoldSourceType;
  status: ReviewVisibilityHoldStatus;
  villageSlug: string | null;
};

type RecordReviewVisibilityHoldEventInput = {
  action?: ReviewVisibilityHoldEventAction;
  actorId?: string;
  actorRole?: string;
  fromStatus?: ReviewVisibilityHoldStatus | null;
  holdId: string;
  metadata?: Record<string, unknown>;
  note?: string | null;
  reason: ReviewVisibilityHoldReason;
  reviewId: string;
  sourceId?: string | null;
  sourceType: ReviewVisibilityHoldSourceType;
  toStatus: ReviewVisibilityHoldStatus;
};

const holdStatuses: ReviewVisibilityHoldStatus[] = ["active", "released"];
const holdReasons: ReviewVisibilityHoldReason[] = [
  "high_risk_moderation",
  "privacy_report",
  "inappropriate_report",
  "spam_report",
];
const holdSourceTypes: ReviewVisibilityHoldSourceType[] = [
  "moderation_check",
  "review_report",
  "system",
];
const holdEventActions: ReviewVisibilityHoldEventAction[] = [
  "created",
  "activated",
  "released",
  "reactivated",
  "updated",
  "metadata_changed",
  "status_changed",
];

export class ReviewVisibilityHoldEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review visibility hold event.");
    this.name = "ReviewVisibilityHoldEventAccessError";
  }
}

export class ReviewVisibilityHoldEventError extends Error {
  constructor(message = "Review visibility hold event is not available.") {
    super(message);
    this.name = "ReviewVisibilityHoldEventError";
  }
}

export async function listHostReviewVisibilityHoldEventsFromDb(
  holdId: string,
  options: ReviewVisibilityHoldEventAccessOptions & { limit?: number } = {},
): Promise<ReviewVisibilityHoldEvent[]> {
  const hold = await getHoldForEvent(holdId);
  if (!hold) throw new ReviewVisibilityHoldEventError("Review visibility hold was not found.");
  if (options.expectedReviewId && hold.reviewId !== options.expectedReviewId) {
    throw new ReviewVisibilityHoldEventError("Review visibility hold was not found.");
  }
  assertAccess(hold, options);

  const rows = await getDb()
    .select()
    .from(reviewVisibilityHoldEvents)
    .where(eq(reviewVisibilityHoldEvents.holdId, holdId))
    .orderBy(desc(reviewVisibilityHoldEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapHoldEvent);
}

export async function recordReviewVisibilityHoldEvent(
  input: RecordReviewVisibilityHoldEventInput,
  options: ReviewVisibilityHoldEventAccessOptions = {},
): Promise<ReviewVisibilityHoldEvent> {
  const hold = await getHoldForEvent(input.holdId);
  if (!hold) throw new ReviewVisibilityHoldEventError("Review visibility hold was not found.");
  if (hold.reviewId !== input.reviewId) {
    throw new ReviewVisibilityHoldEventError("Review visibility hold was not found.");
  }
  assertAccess(hold, options);

  const action = input.action ?? getHoldEventAction(input.fromStatus ?? null, input.toStatus);
  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = actorId
    ? await findRecentTriggerEvent({
        action,
        fromStatus: input.fromStatus ?? null,
        holdId: input.holdId,
        toStatus: input.toStatus,
      })
    : null;

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewVisibilityHoldEvents)
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
        .where(eq(reviewVisibilityHoldEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.visibility_hold_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_visibility_hold_event",
        metadata: {
          eventAction: updated.action,
          holdId: updated.holdId,
          reviewId: updated.reviewId,
          toStatus: updated.toStatus,
        },
      });
      return mapHoldEvent(updated);
    }
  }

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewVisibilityHoldEvents)
      .values({
        action,
        actorId,
        actorRole,
        fromStatus: input.fromStatus ?? null,
        holdId: input.holdId,
        metadata,
        note: normalizeOptionalText(input.note),
        reason: input.reason,
        reviewId: input.reviewId,
        sourceId: input.sourceId ?? null,
        sourceType: input.sourceType,
        toStatus: input.toStatus,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.visibility_hold_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_visibility_hold_event",
    metadata: {
      eventAction: row.action,
      holdId: row.holdId,
      reviewId: row.reviewId,
      toStatus: row.toStatus,
    },
  });

  return mapHoldEvent(row);
}

export async function safeRecordReviewVisibilityHoldEvent(
  input: RecordReviewVisibilityHoldEventInput,
  options: ReviewVisibilityHoldEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewVisibilityHoldEvent(input, options);
  } catch {
    // Visibility hold event logging should never break the primary hold action.
  }
}

export function getHoldEventAction(
  fromStatus: ReviewVisibilityHoldStatus | null | undefined,
  toStatus: ReviewVisibilityHoldStatus,
): ReviewVisibilityHoldEventAction {
  if (!fromStatus) return "created";
  if (fromStatus === "released" && toStatus === "active") return "reactivated";
  if (fromStatus !== toStatus && toStatus === "active") return "activated";
  if (fromStatus !== toStatus && toStatus === "released") return "released";
  return "metadata_changed";
}

async function findRecentTriggerEvent(input: {
  action: ReviewVisibilityHoldEventAction;
  fromStatus: ReviewVisibilityHoldStatus | null;
  holdId: string;
  toStatus: ReviewVisibilityHoldStatus;
}) {
  const fromStatusPredicate = input.fromStatus
    ? eq(reviewVisibilityHoldEvents.fromStatus, input.fromStatus)
    : isNull(reviewVisibilityHoldEvents.fromStatus);
  const [row] = await getDb()
    .select()
    .from(reviewVisibilityHoldEvents)
    .where(
      and(
        eq(reviewVisibilityHoldEvents.holdId, input.holdId),
        fromStatusPredicate,
        eq(reviewVisibilityHoldEvents.toStatus, input.toStatus),
        eq(reviewVisibilityHoldEvents.action, input.action),
        isNull(reviewVisibilityHoldEvents.actorId),
        gte(reviewVisibilityHoldEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewVisibilityHoldEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getHoldForEvent(
  holdId: string,
): Promise<ReviewVisibilityHoldForEvent | null> {
  if (!isUuid(holdId)) return null;

  const [row] = await getDb()
    .select({
      id: reviewVisibilityHolds.id,
      programVillageId: programsTable.villageId,
      reason: reviewVisibilityHolds.reason,
      reviewId: reviewVisibilityHolds.reviewId,
      sourceId: reviewVisibilityHolds.sourceId,
      sourceType: reviewVisibilityHolds.sourceType,
      status: reviewVisibilityHolds.status,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewVisibilityHolds)
    .innerJoin(reviewsTable, eq(reviewVisibilityHolds.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewVisibilityHolds.id, holdId))
    .limit(1);

  return row
    ? {
        id: row.id,
        programVillageId: row.programVillageId,
        reason: asHoldReason(row.reason),
        reviewId: row.reviewId,
        sourceId: row.sourceId,
        sourceType: asHoldSourceType(row.sourceType),
        status: asHoldStatus(row.status),
        villageSlug: row.villageSlug,
      }
    : null;
}

function assertAccess(
  hold: ReviewVisibilityHoldForEvent,
  options: ReviewVisibilityHoldEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (hold.villageSlug && options.allowedVillageSlugs?.includes(hold.villageSlug)) return;
  if (hold.programVillageId && options.allowedVillageIds?.includes(hold.programVillageId)) return;
  throw new ReviewVisibilityHoldEventAccessError();
}

function mapHoldEvent(
  row: typeof reviewVisibilityHoldEvents.$inferSelect,
): ReviewVisibilityHoldEvent {
  return {
    action: asHoldEventAction(row.action),
    actorId: row.actorId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    createdAt: row.createdAt.toISOString(),
    fromStatus: row.fromStatus ? asHoldStatus(row.fromStatus) : undefined,
    holdId: row.holdId,
    id: row.id,
    metadata: asRecord(row.metadata),
    note: row.note ?? undefined,
    reason: asHoldReason(row.reason),
    reviewId: row.reviewId,
    sourceId: row.sourceId ?? undefined,
    sourceType: asHoldSourceType(row.sourceType),
    toStatus: asHoldStatus(row.toStatus),
  };
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

function asHoldStatus(value: string): ReviewVisibilityHoldStatus {
  return holdStatuses.includes(value as ReviewVisibilityHoldStatus)
    ? (value as ReviewVisibilityHoldStatus)
    : "active";
}

function asHoldReason(value: string): ReviewVisibilityHoldReason {
  return holdReasons.includes(value as ReviewVisibilityHoldReason)
    ? (value as ReviewVisibilityHoldReason)
    : "high_risk_moderation";
}

function asHoldSourceType(value: string): ReviewVisibilityHoldSourceType {
  return holdSourceTypes.includes(value as ReviewVisibilityHoldSourceType)
    ? (value as ReviewVisibilityHoldSourceType)
    : "system";
}

function asHoldEventAction(value: string): ReviewVisibilityHoldEventAction {
  return holdEventActions.includes(value as ReviewVisibilityHoldEventAction)
    ? (value as ReviewVisibilityHoldEventAction)
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