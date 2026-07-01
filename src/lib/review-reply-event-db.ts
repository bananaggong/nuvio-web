import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewHostReplies,
  reviewHostReplyEvents,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type { ReviewHostReplyStatus } from "@/lib/review-reply-db";

export type ReviewHostReplyEventAction =
  | "created"
  | "updated"
  | "published"
  | "hidden"
  | "status_changed";

export type ReviewHostReplyEvent = {
  action: ReviewHostReplyEventAction;
  actorId?: string;
  actorRole?: string;
  authorName: string;
  body: string;
  createdAt: string;
  fromStatus?: ReviewHostReplyStatus;
  id: string;
  metadata: Record<string, unknown>;
  note?: string;
  replyId: string;
  reviewId: string;
  toStatus: ReviewHostReplyStatus;
};

type ReviewHostReplyEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewForReplyEvent = {
  id: string;
  programVillageId: string | null;
  villageSlug: string | null;
};

type RecordReviewHostReplyEventInput = {
  action?: ReviewHostReplyEventAction;
  actorId?: string;
  actorRole?: string;
  fromStatus?: ReviewHostReplyStatus | null;
  metadata?: Record<string, unknown>;
  note?: string | null;
  replyId: string;
  reviewId: string;
  toStatus: ReviewHostReplyStatus;
};

const replyStatuses: ReviewHostReplyStatus[] = ["published", "hidden"];
const replyEventActions: ReviewHostReplyEventAction[] = [
  "created",
  "updated",
  "published",
  "hidden",
  "status_changed",
];

export class ReviewHostReplyEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review host reply event.");
    this.name = "ReviewHostReplyEventAccessError";
  }
}

export class ReviewHostReplyEventError extends Error {
  constructor(message = "Review host reply event is not available.") {
    super(message);
    this.name = "ReviewHostReplyEventError";
  }
}

export async function listHostReviewReplyEventsFromDb(
  reviewId: string,
  options: ReviewHostReplyEventAccessOptions & { limit?: number } = {},
): Promise<ReviewHostReplyEvent[]> {
  const review = await getReviewForReplyEvent(reviewId);
  if (!review) throw new ReviewHostReplyEventError("Review was not found.");
  assertAccess(review, options);

  const rows = await getDb()
    .select()
    .from(reviewHostReplyEvents)
    .where(eq(reviewHostReplyEvents.reviewId, reviewId))
    .orderBy(desc(reviewHostReplyEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapReplyEvent);
}

export async function recordReviewHostReplyEvent(
  input: RecordReviewHostReplyEventInput,
  options: ReviewHostReplyEventAccessOptions = {},
): Promise<ReviewHostReplyEvent> {
  const review = await getReviewForReplyEvent(input.reviewId);
  if (!review) throw new ReviewHostReplyEventError("Review was not found.");
  assertAccess(review, options);

  const action = input.action ?? getReplyEventAction(input.fromStatus ?? null, input.toStatus);
  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = actorId
    ? await findRecentTriggerEvent({
        action,
        fromStatus: input.fromStatus ?? null,
        replyId: input.replyId,
        toStatus: input.toStatus,
      })
    : null;

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewHostReplyEvents)
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
        .where(eq(reviewHostReplyEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.host_reply_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_host_reply_event",
        metadata: {
          eventAction: updated.action,
          replyId: updated.replyId,
          reviewId: updated.reviewId,
          toStatus: updated.toStatus,
        },
      });
      return mapReplyEvent(updated);
    }
  }

  const reply = await getReplySnapshot(input.replyId);
  if (!reply) throw new ReviewHostReplyEventError("Review host reply was not found.");

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewHostReplyEvents)
      .values({
        action,
        actorId,
        actorRole,
        authorName: reply.authorName,
        body: reply.body,
        fromStatus: input.fromStatus ?? null,
        metadata,
        note: normalizeOptionalText(input.note),
        replyId: input.replyId,
        reviewId: input.reviewId,
        toStatus: input.toStatus,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.host_reply_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_host_reply_event",
    metadata: {
      eventAction: row.action,
      replyId: row.replyId,
      reviewId: row.reviewId,
      toStatus: row.toStatus,
    },
  });

  return mapReplyEvent(row);
}

export async function safeRecordReviewHostReplyEvent(
  input: RecordReviewHostReplyEventInput,
  options: ReviewHostReplyEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewHostReplyEvent(input, options);
  } catch {
    // Host reply event logging should never break the primary reply action.
  }
}

export function getReplyEventAction(
  fromStatus: ReviewHostReplyStatus | null | undefined,
  toStatus: ReviewHostReplyStatus,
): ReviewHostReplyEventAction {
  if (!fromStatus) return "created";
  if (fromStatus !== toStatus && toStatus === "hidden") return "hidden";
  if (fromStatus !== toStatus && toStatus === "published") return "published";
  if (fromStatus !== toStatus) return "status_changed";
  return "updated";
}

async function findRecentTriggerEvent(input: {
  action: ReviewHostReplyEventAction;
  fromStatus: ReviewHostReplyStatus | null;
  replyId: string;
  toStatus: ReviewHostReplyStatus;
}) {
  const fromStatusPredicate = input.fromStatus
    ? eq(reviewHostReplyEvents.fromStatus, input.fromStatus)
    : isNull(reviewHostReplyEvents.fromStatus);
  const [row] = await getDb()
    .select()
    .from(reviewHostReplyEvents)
    .where(
      and(
        eq(reviewHostReplyEvents.replyId, input.replyId),
        fromStatusPredicate,
        eq(reviewHostReplyEvents.toStatus, input.toStatus),
        eq(reviewHostReplyEvents.action, input.action),
        isNull(reviewHostReplyEvents.actorId),
        gte(reviewHostReplyEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewHostReplyEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getReplySnapshot(
  replyId: string,
): Promise<{ authorName: string; body: string } | null> {
  if (!isUuid(replyId)) return null;

  const [row] = await getDb()
    .select({
      authorName: reviewHostReplies.authorName,
      body: reviewHostReplies.body,
    })
    .from(reviewHostReplies)
    .where(eq(reviewHostReplies.id, replyId))
    .limit(1);

  return row ?? null;
}

async function getReviewForReplyEvent(
  reviewId: string,
): Promise<ReviewForReplyEvent | null> {
  if (!isUuid(reviewId)) return null;

  const [row] = await getDb()
    .select({
      id: reviewsTable.id,
      programVillageId: programsTable.villageId,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewsTable.id, reviewId))
    .limit(1);

  return row ?? null;
}

function assertAccess(
  review: ReviewForReplyEvent,
  options: ReviewHostReplyEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (review.villageSlug && options.allowedVillageSlugs?.includes(review.villageSlug)) return;
  if (review.programVillageId && options.allowedVillageIds?.includes(review.programVillageId)) return;
  throw new ReviewHostReplyEventAccessError();
}

function mapReplyEvent(
  row: typeof reviewHostReplyEvents.$inferSelect,
): ReviewHostReplyEvent {
  return {
    action: asReplyEventAction(row.action),
    actorId: row.actorId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    authorName: row.authorName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    fromStatus: row.fromStatus ? asReplyStatus(row.fromStatus) : undefined,
    id: row.id,
    metadata: asRecord(row.metadata),
    note: row.note ?? undefined,
    replyId: row.replyId,
    reviewId: row.reviewId,
    toStatus: asReplyStatus(row.toStatus),
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

function asReplyStatus(value: string): ReviewHostReplyStatus {
  return replyStatuses.includes(value as ReviewHostReplyStatus)
    ? (value as ReviewHostReplyStatus)
    : "published";
}

function asReplyEventAction(value: string): ReviewHostReplyEventAction {
  return replyEventActions.includes(value as ReviewHostReplyEventAction)
    ? (value as ReviewHostReplyEventAction)
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