import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewHostReplies,
  reviews as reviewsTable,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { publicReviewSafetyPredicate } from "@/lib/review-public-visibility-db";
import { safeRecordReviewHostReplyEvent } from "@/lib/review-reply-event-db";

export type ReviewHostReplyStatus = "published" | "hidden";

export type ReviewHostReply = {
  id: string;
  reviewId: string;
  authorName: string;
  body: string;
  status: ReviewHostReplyStatus;
  createdAt: string;
  updatedAt: string;
  hiddenAt?: string;
};

type ReplyRow = typeof reviewHostReplies.$inferSelect;

type ReviewAccessRow = {
  id: string;
  programVillageId: string | null;
  status: string;
  title: string;
  villageSlug: string | null;
};

export class ReviewReplyAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review reply.");
    this.name = "ReviewReplyAccessError";
  }
}

export class ReviewReplyError extends Error {
  constructor(message = "Review reply is not available.") {
    super(message);
    this.name = "ReviewReplyError";
  }
}

export async function listPublicReviewHostReplies(
  reviewId: string,
): Promise<ReviewHostReply[]> {
  if (!isUuid(reviewId)) return [];

  const rows = await getDb()
    .select({ reply: reviewHostReplies })
    .from(reviewHostReplies)
    .innerJoin(reviewsTable, eq(reviewHostReplies.reviewId, reviewsTable.id))
    .where(
      and(
        eq(reviewHostReplies.reviewId, reviewId),
        eq(reviewHostReplies.status, "published"),
        eq(reviewsTable.status, "published"),
        publicReviewSafetyPredicate(),
      ),
    )
    .orderBy(desc(reviewHostReplies.createdAt))
    .limit(10);

  return rows.map(({ reply }) => mapReply(reply));
}

export async function upsertHostReviewReply(
  reviewId: string,
  input: unknown,
  auth: ApiAuthContext,
  options: { allowedVillageIds?: string[]; allowedVillageSlugs?: string[] } = {},
): Promise<ReviewHostReply> {
  if (!isUuid(reviewId)) throw new ReviewReplyError("Invalid review id.");

  const normalized = normalizeReplyInput(input);
  const review = await getReviewForReplyAccess(reviewId, options);
  if (!review) throw new ReviewReplyError("Review was not found.");
  if (review.status !== "published" && review.status !== "pending") {
    throw new ReviewReplyError("This review cannot receive a host reply.");
  }

  const authorName = normalizeAuthorName(auth);
  const now = new Date();
  let eventFromStatus: ReviewHostReplyStatus | null = null;
  let shouldRecordEvent = true;

  const [row] = await getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(reviewHostReplies)
      .where(eq(reviewHostReplies.reviewId, reviewId))
      .limit(1);

    if (existing) {
      const nextStatus = normalized.status;
      eventFromStatus = asReplyStatus(existing.status);
      shouldRecordEvent =
        eventFromStatus !== nextStatus
        || existing.body !== normalized.body
        || existing.authorName !== authorName;

      const [updated] = await tx
        .update(reviewHostReplies)
        .set({
          authorId: auth.user.id,
          authorName,
          body: normalized.body,
          hiddenAt: nextStatus === "hidden" ? now : null,
          status: nextStatus,
          updatedAt: now,
        })
        .where(eq(reviewHostReplies.id, existing.id))
        .returning();
      return [updated];
    }

    const [created] = await tx
      .insert(reviewHostReplies)
      .values({
        authorId: auth.user.id,
        authorName,
        body: normalized.body,
        hiddenAt: normalized.status === "hidden" ? now : null,
        reviewId,
        status: normalized.status,
      })
      .returning();
    return [created];
  });

  void safeCreateAuditLog({
    action: "review.host_reply.upsert",
    actorId: auth.user.id,
    entityId: row.id,
    entityType: "review_host_reply",
    metadata: {
      reviewId,
      status: row.status,
    },
  });

  if (shouldRecordEvent) {
    await safeRecordReviewHostReplyEvent({
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      fromStatus: eventFromStatus,
      metadata: {
        source: "host_reply_upsert",
      },
      replyId: row.id,
      reviewId,
      toStatus: asReplyStatus(row.status),
    }, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      allowedVillageIds: options.allowedVillageIds,
      allowedVillageSlugs: options.allowedVillageSlugs,
    });
  }

  return mapReply(row);
}

export async function updateHostReviewReplyStatus(
  reviewId: string,
  status: ReviewHostReplyStatus,
  auth: ApiAuthContext,
  options: { allowedVillageIds?: string[]; allowedVillageSlugs?: string[] } = {},
): Promise<ReviewHostReply> {
  if (!isUuid(reviewId)) throw new ReviewReplyError("Invalid review id.");

  const review = await getReviewForReplyAccess(reviewId, options);
  if (!review) throw new ReviewReplyError("Review was not found.");

  const [existing] = await getDb()
    .select()
    .from(reviewHostReplies)
    .where(eq(reviewHostReplies.reviewId, reviewId))
    .limit(1);

  if (!existing) throw new ReviewReplyError("Host reply was not found.");

  const nextStatus = asReplyStatus(status);
  const now = new Date();
  const [row] = await getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(reviewHostReplies)
      .set({
        hiddenAt: nextStatus === "hidden" ? now : null,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(reviewHostReplies.id, existing.id))
      .returning();

    return [updated];
  });

  void safeCreateAuditLog({
    action: "review.host_reply.status.update",
    actorId: auth.user.id,
    entityId: row.id,
    entityType: "review_host_reply",
    metadata: {
      fromStatus: existing.status,
      reviewId,
      status: row.status,
    },
  });

  if (existing.status !== row.status) {
    await safeRecordReviewHostReplyEvent({
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      fromStatus: asReplyStatus(existing.status),
      metadata: {
        source: "host_reply_status_update",
      },
      replyId: row.id,
      reviewId,
      toStatus: asReplyStatus(row.status),
    }, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      allowedVillageIds: options.allowedVillageIds,
      allowedVillageSlugs: options.allowedVillageSlugs,
    });
  }

  return mapReply(row);
}

async function getReviewForReplyAccess(
  reviewId: string,
  options: { allowedVillageIds?: string[]; allowedVillageSlugs?: string[] },
): Promise<ReviewAccessRow | null> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) return null;
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) return null;

  const conditions: SQL[] = [eq(reviewsTable.id, reviewId)];
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

  const [row] = await getDb()
    .select({
      id: reviewsTable.id,
      programVillageId: programsTable.villageId,
      status: reviewsTable.status,
      title: reviewsTable.title,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}

function normalizeReplyInput(input: unknown): {
  body: string;
  status: ReviewHostReplyStatus;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Reply payload is required.");
  }

  const value = input as Record<string, unknown>;
  return {
    body: normalizeBody(value.body),
    status: asReplyStatus(value.status),
  };
}

function normalizeBody(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 2) throw new Error("Reply body must be at least 2 characters.");
  if (text.length > 2000) throw new Error("Reply body must be 2000 characters or less.");
  return text;
}

function asReplyStatus(value: unknown): ReviewHostReplyStatus {
  return value === "hidden" ? "hidden" : "published";
}

function normalizeAuthorName(auth: ApiAuthContext): string {
  return (
    auth.profile.displayName ||
    auth.profile.fullName ||
    auth.profile.email ||
    auth.user.email ||
    "Host"
  )
    .trim()
    .slice(0, 80);
}

function mapReply(row: ReplyRow): ReviewHostReply {
  return {
    id: row.id,
    reviewId: row.reviewId,
    authorName: row.authorName,
    body: row.body,
    status: asReplyStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hiddenAt: row.hiddenAt?.toISOString(),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}