import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reviewHelpfulVotes, reviews as reviewsTable } from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { buildPublicReviewVisibilityConditions } from "@/lib/review-public-visibility-db";

export type ReviewHelpfulResult = {
  helpful: boolean;
  likes: number;
  reviewId: string;
};

export class ReviewInteractionError extends Error {
  constructor(message = "Review interaction is not available.") {
    super(message);
    this.name = "ReviewInteractionError";
  }
}

export async function setReviewHelpful(
  reviewId: string,
  helpful: boolean,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulResult> {
  if (!isUuid(reviewId)) throw new ReviewInteractionError("Invalid review id.");

  const [review] = await getDb()
    .select({
      id: reviewsTable.id,
      likes: reviewsTable.likes,
      status: reviewsTable.status,
      userId: reviewsTable.userId,
    })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.id, reviewId), ...buildPublicReviewVisibilityConditions()))
    .limit(1);

  if (!review) {
    throw new ReviewInteractionError("Published review was not found.");
  }
  if (review.userId === auth.user.id) {
    throw new ReviewInteractionError("You cannot mark your own review as helpful.");
  }

  const result = helpful
    ? await addHelpfulVote(reviewId, auth)
    : await removeHelpfulVote(reviewId, auth);

  void safeCreateAuditLog({
    action: helpful ? "review.helpful.add" : "review.helpful.remove",
    actorId: auth.user.id,
    entityId: reviewId,
    entityType: "review",
    metadata: { helpful: result.helpful, likes: result.likes },
  });

  return result;
}

async function addHelpfulVote(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulResult> {
  return getDb().transaction(async (tx) => {
    const inserted = await tx
      .insert(reviewHelpfulVotes)
      .values({ reviewId, userId: auth.user.id })
      .onConflictDoNothing()
      .returning({ reviewId: reviewHelpfulVotes.reviewId });

    if (inserted.length > 0) {
      const [updated] = await tx
        .update(reviewsTable)
        .set({ likes: sql`${reviewsTable.likes} + 1`, updatedAt: new Date() })
        .where(eq(reviewsTable.id, reviewId))
        .returning({ likes: reviewsTable.likes });

      return { helpful: true, likes: updated?.likes ?? 0, reviewId };
    }

    const [current] = await tx
      .select({ likes: reviewsTable.likes })
      .from(reviewsTable)
      .where(eq(reviewsTable.id, reviewId))
      .limit(1);

    return { helpful: true, likes: current?.likes ?? 0, reviewId };
  });
}

async function removeHelpfulVote(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulResult> {
  return getDb().transaction(async (tx) => {
    const deleted = await tx
      .delete(reviewHelpfulVotes)
      .where(
        and(
          eq(reviewHelpfulVotes.reviewId, reviewId),
          eq(reviewHelpfulVotes.userId, auth.user.id),
        ),
      )
      .returning({ reviewId: reviewHelpfulVotes.reviewId });

    if (deleted.length > 0) {
      const [updated] = await tx
        .update(reviewsTable)
        .set({
          likes: sql`greatest(${reviewsTable.likes} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(reviewsTable.id, reviewId))
        .returning({ likes: reviewsTable.likes });

      return { helpful: false, likes: updated?.likes ?? 0, reviewId };
    }

    const [current] = await tx
      .select({ likes: reviewsTable.likes })
      .from(reviewsTable)
      .where(eq(reviewsTable.id, reviewId))
      .limit(1);

    return { helpful: false, likes: current?.likes ?? 0, reviewId };
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}