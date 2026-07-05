import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewStatusEvents,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type { ReviewStatus } from "@/lib/types";

export type ReviewStatusEventAction =
  | "created"
  | "updated"
  | "published"
  | "hidden"
  | "restored"
  | "moved_to_pending"
  | "moved_to_draft"
  | "status_changed"
  | "moderation_checked"
  | "deleted";

export type ReviewStatusEvent = {
  action: ReviewStatusEventAction;
  actorId?: string;
  actorRole?: string;
  createdAt: string;
  fromStatus?: ReviewStatus;
  id: string;
  metadata: Record<string, unknown>;
  note?: string;
  reason?: string;
  reviewId: string;
  toStatus: ReviewStatus;
};

type ReviewStatusEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewForStatusEvent = {
  id: string;
  programVillageId: string | null;
  status: ReviewStatus;
  villageSlug: string | null;
};

type RecordReviewStatusEventInput = {
  action?: ReviewStatusEventAction;
  actorId?: string;
  actorRole?: string;
  fromStatus?: ReviewStatus | null;
  metadata?: Record<string, unknown>;
  note?: string | null;
  reason?: string | null;
  reviewId: string;
  toStatus: ReviewStatus;
};

export class ReviewStatusEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review status event.");
    this.name = "ReviewStatusEventAccessError";
  }
}

export class ReviewStatusEventError extends Error {
  constructor(message = "Review status event is not available.") {
    super(message);
    this.name = "ReviewStatusEventError";
  }
}

export async function listHostReviewStatusEventsFromDb(
  reviewId: string,
  options: ReviewStatusEventAccessOptions & { limit?: number } = {},
): Promise<ReviewStatusEvent[]> {
  const review = await getReviewForStatusEvent(reviewId);
  if (!review) throw new ReviewStatusEventError("Review was not found.");
  assertAccess(review, options);

  const rows = await getDb()
    .select()
    .from(reviewStatusEvents)
    .where(eq(reviewStatusEvents.reviewId, reviewId))
    .orderBy(desc(reviewStatusEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapStatusEvent);
}

export async function recordReviewStatusEvent(
  input: RecordReviewStatusEventInput,
  options: ReviewStatusEventAccessOptions = {},
): Promise<ReviewStatusEvent> {
  const review = await getReviewForStatusEvent(input.reviewId);
  if (!review) throw new ReviewStatusEventError("Review was not found.");
  assertAccess(review, options);

  const action = input.action ?? getStatusEventAction(input.fromStatus ?? null, input.toStatus);
  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = await findRecentTriggerEvent({
    action,
    fromStatus: input.fromStatus ?? null,
    reviewId: input.reviewId,
    toStatus: input.toStatus,
  });

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewStatusEvents)
        .set({
          actorId,
          actorRole,
          metadata: {
            ...asRecord(recentTriggerEvent.metadata),
            ...metadata,
            enrichedBy: "application_service",
          },
          note: normalizeOptionalText(input.note) ?? recentTriggerEvent.note,
          reason: normalizeOptionalText(input.reason) ?? recentTriggerEvent.reason,
        })
        .where(eq(reviewStatusEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.status_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_status_event",
        metadata: {
          eventAction: updated.action,
          reviewId: updated.reviewId,
          toStatus: updated.toStatus,
        },
      });
      return mapStatusEvent(updated);
    }
  }

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewStatusEvents)
      .values({
        action,
        actorId,
        actorRole,
        fromStatus: input.fromStatus ?? null,
        metadata,
        note: normalizeOptionalText(input.note),
        reason: normalizeOptionalText(input.reason),
        reviewId: input.reviewId,
        toStatus: input.toStatus,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.status_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_status_event",
    metadata: {
      eventAction: row.action,
      reviewId: row.reviewId,
      toStatus: row.toStatus,
    },
  });

  return mapStatusEvent(row);
}

export async function safeRecordReviewStatusEvent(
  input: RecordReviewStatusEventInput,
  options: ReviewStatusEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewStatusEvent(input, options);
  } catch {
    // Status event logging should never break the primary review action.
  }
}

export function getStatusEventAction(
  fromStatus: ReviewStatus | null | undefined,
  toStatus: ReviewStatus,
): ReviewStatusEventAction {
  if (!fromStatus) return "created";
  if (toStatus === "deleted") return "deleted";
  if (fromStatus === "hidden" && toStatus !== "hidden") return "restored";
  if (toStatus === "published") return "published";
  if (toStatus === "hidden") return "hidden";
  if (toStatus === "pending") return "moved_to_pending";
  if (toStatus === "draft") return "moved_to_draft";
  return "status_changed";
}

async function findRecentTriggerEvent(input: {
  action: ReviewStatusEventAction;
  fromStatus: ReviewStatus | null;
  reviewId: string;
  toStatus: ReviewStatus;
}) {
  const fromStatusPredicate = input.fromStatus
    ? eq(reviewStatusEvents.fromStatus, input.fromStatus)
    : isNull(reviewStatusEvents.fromStatus);
  const [row] = await getDb()
    .select()
    .from(reviewStatusEvents)
    .where(
      and(
        eq(reviewStatusEvents.reviewId, input.reviewId),
        fromStatusPredicate,
        eq(reviewStatusEvents.toStatus, input.toStatus),
        eq(reviewStatusEvents.action, input.action),
        isNull(reviewStatusEvents.actorId),
        sql`${reviewStatusEvents.metadata}->>'source' = 'database_trigger'`,
        gte(reviewStatusEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewStatusEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getReviewForStatusEvent(
  reviewId: string,
): Promise<ReviewForStatusEvent | null> {
  if (!isUuid(reviewId)) return null;

  const [row] = await getDb()
    .select({
      id: reviewsTable.id,
      programVillageId: programsTable.villageId,
      status: reviewsTable.status,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewsTable.id, reviewId))
    .limit(1);

  return row ?? null;
}

function assertAccess(
  review: ReviewForStatusEvent,
  options: ReviewStatusEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (review.villageSlug && options.allowedVillageSlugs?.includes(review.villageSlug)) return;
  if (review.programVillageId && options.allowedVillageIds?.includes(review.programVillageId)) return;
  throw new ReviewStatusEventAccessError();
}

function mapStatusEvent(
  row: typeof reviewStatusEvents.$inferSelect,
): ReviewStatusEvent {
  return {
    action: asAction(row.action),
    actorId: row.actorId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    createdAt: row.createdAt.toISOString(),
    fromStatus: row.fromStatus ?? undefined,
    id: row.id,
    metadata: asRecord(row.metadata),
    note: row.note ?? undefined,
    reason: row.reason ?? undefined,
    reviewId: row.reviewId,
    toStatus: row.toStatus,
  };
}

function asAction(value: string): ReviewStatusEventAction {
  return isStatusEventAction(value) ? value : "status_changed";
}

function isStatusEventAction(value: string): value is ReviewStatusEventAction {
  return [
    "created",
    "updated",
    "published",
    "hidden",
    "restored",
    "moved_to_pending",
    "moved_to_draft",
    "status_changed",
    "moderation_checked",
    "deleted",
  ].includes(value);
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