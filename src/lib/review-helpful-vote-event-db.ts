import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewHelpfulVoteEvents,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";

export type ReviewHelpfulVoteEventAction = "added" | "removed";

export type ReviewHelpfulVoteEvent = {
  action: ReviewHelpfulVoteEventAction;
  actorId?: string;
  actorRole?: string;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
  reviewId: string;
  userId: string;
};

type ReviewHelpfulVoteEventAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewForHelpfulVoteEvent = {
  id: string;
  programVillageId: string | null;
  villageSlug: string | null;
};

type RecordReviewHelpfulVoteEventInput = {
  action: ReviewHelpfulVoteEventAction;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
  reviewId: string;
  userId: string;
};

const helpfulVoteActions: ReviewHelpfulVoteEventAction[] = ["added", "removed"];

export class ReviewHelpfulVoteEventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review helpful vote event.");
    this.name = "ReviewHelpfulVoteEventAccessError";
  }
}

export class ReviewHelpfulVoteEventError extends Error {
  constructor(message = "Review helpful vote event is not available.") {
    super(message);
    this.name = "ReviewHelpfulVoteEventError";
  }
}

export async function listHostReviewHelpfulVoteEventsFromDb(
  reviewId: string,
  options: ReviewHelpfulVoteEventAccessOptions & { limit?: number } = {},
): Promise<ReviewHelpfulVoteEvent[]> {
  const review = await getReviewForHelpfulVoteEvent(reviewId);
  if (!review) throw new ReviewHelpfulVoteEventError("Review was not found.");
  assertAccess(review, options);

  const rows = await getDb()
    .select()
    .from(reviewHelpfulVoteEvents)
    .where(eq(reviewHelpfulVoteEvents.reviewId, reviewId))
    .orderBy(desc(reviewHelpfulVoteEvents.createdAt))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapHelpfulVoteEvent);
}

export async function recordReviewHelpfulVoteEvent(
  input: RecordReviewHelpfulVoteEventInput,
  options: ReviewHelpfulVoteEventAccessOptions = {},
): Promise<ReviewHelpfulVoteEvent> {
  const review = await getReviewForHelpfulVoteEvent(input.reviewId);
  if (!review) throw new ReviewHelpfulVoteEventError("Review was not found.");
  assertAccess(review, options);

  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = sanitizeMetadata(input.metadata);
  const recentTriggerEvent = actorId
    ? await findRecentTriggerEvent({
        action: input.action,
        reviewId: input.reviewId,
        userId: input.userId,
      })
    : null;

  if (recentTriggerEvent) {
    const [updated] = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

      return tx
        .update(reviewHelpfulVoteEvents)
        .set({
          actorId,
          actorRole,
          metadata: {
            ...asRecord(recentTriggerEvent.metadata),
            ...metadata,
            enrichedBy: "application_service",
          },
        })
        .where(eq(reviewHelpfulVoteEvents.id, recentTriggerEvent.id))
        .returning();
    });

    if (updated) {
      void safeCreateAuditLog({
        action: "review.helpful_vote_event.enrich",
        actorId,
        entityId: updated.id,
        entityType: "review_helpful_vote_event",
        metadata: {
          eventAction: updated.action,
          reviewId: updated.reviewId,
          userId: updated.userId,
        },
      });
      return mapHelpfulVoteEvent(updated);
    }
  }

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_insert_allowed', 'true', true)`);

    return tx
      .insert(reviewHelpfulVoteEvents)
      .values({
        action: input.action,
        actorId,
        actorRole,
        metadata,
        reviewId: input.reviewId,
        userId: input.userId,
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.helpful_vote_event.create",
    actorId,
    entityId: row.id,
    entityType: "review_helpful_vote_event",
    metadata: {
      eventAction: row.action,
      reviewId: row.reviewId,
      userId: row.userId,
    },
  });

  return mapHelpfulVoteEvent(row);
}

export async function safeRecordReviewHelpfulVoteEvent(
  input: RecordReviewHelpfulVoteEventInput,
  options: ReviewHelpfulVoteEventAccessOptions = {},
): Promise<void> {
  try {
    await recordReviewHelpfulVoteEvent(input, options);
  } catch {
    // Helpful vote event logging should never break the primary reaction action.
  }
}

async function findRecentTriggerEvent(input: {
  action: ReviewHelpfulVoteEventAction;
  reviewId: string;
  userId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(reviewHelpfulVoteEvents)
    .where(
      and(
        eq(reviewHelpfulVoteEvents.reviewId, input.reviewId),
        eq(reviewHelpfulVoteEvents.userId, input.userId),
        eq(reviewHelpfulVoteEvents.action, input.action),
        isNull(reviewHelpfulVoteEvents.actorId),
        gte(reviewHelpfulVoteEvents.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(reviewHelpfulVoteEvents.createdAt))
    .limit(1);

  return row ?? null;
}

async function getReviewForHelpfulVoteEvent(
  reviewId: string,
): Promise<ReviewForHelpfulVoteEvent | null> {
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
  review: ReviewForHelpfulVoteEvent,
  options: ReviewHelpfulVoteEventAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (review.villageSlug && options.allowedVillageSlugs?.includes(review.villageSlug)) return;
  if (review.programVillageId && options.allowedVillageIds?.includes(review.programVillageId)) return;
  throw new ReviewHelpfulVoteEventAccessError();
}

function mapHelpfulVoteEvent(
  row: typeof reviewHelpfulVoteEvents.$inferSelect,
): ReviewHelpfulVoteEvent {
  return {
    action: asAction(row.action),
    actorId: row.actorId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metadata: asRecord(row.metadata),
    reviewId: row.reviewId,
    userId: row.userId,
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

function asAction(value: string): ReviewHelpfulVoteEventAction {
  return helpfulVoteActions.includes(value as ReviewHelpfulVoteEventAction)
    ? (value as ReviewHelpfulVoteEventAction)
    : "added";
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
