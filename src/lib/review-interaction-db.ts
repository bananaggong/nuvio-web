import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplications,
  programs as programsTable,
  reviewHelpfulVotes,
  reviews as reviewsTable,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { safeRecordReviewHelpfulVoteEvent } from "@/lib/review-helpful-vote-event-db";
import { buildPublicReviewVisibilityConditions } from "@/lib/review-public-visibility-db";

export type ReviewHelpfulResult = {
  helpful: boolean;
  likes: number;
  reviewId: string;
};

type ReviewHelpfulMutationResult = ReviewHelpfulResult & {
  changed: boolean;
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
      applicationEmail: programApplications.email,
      applicationSubmittedBy: programApplications.submittedBy,
      id: reviewsTable.id,
      programCreatedBy: programsTable.createdBy,
      status: reviewsTable.status,
      userId: reviewsTable.userId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(programApplications, eq(reviewsTable.applicationId, programApplications.id))
    .where(and(eq(reviewsTable.id, reviewId), ...buildPublicReviewVisibilityConditions()))
    .limit(1);

  if (!review) {
    throw new ReviewInteractionError("Published review was not found.");
  }
  if (authOwnsReviewInteraction(review, auth)) {
    throw new ReviewInteractionError("You cannot mark your own review as helpful.");
  }

  const result = await mutateHelpfulVote(reviewId, helpful, auth);

  if (result.changed) {
    void safeCreateAuditLog({
      action: helpful ? "review.helpful.add" : "review.helpful.remove",
      actorId: auth.user.id,
      entityId: reviewId,
      entityType: "review",
      metadata: { helpful: result.helpful, likes: result.likes },
    });

    await safeRecordReviewHelpfulVoteEvent({
      action: helpful ? "added" : "removed",
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      metadata: {
        helpful: result.helpful,
        likes: result.likes,
        source: "review_helpful_mutation",
      },
      reviewId,
      userId: auth.user.id,
    });
  }

  return { helpful: result.helpful, likes: result.likes, reviewId: result.reviewId };
}

async function mutateHelpfulVote(
  reviewId: string,
  helpful: boolean,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulMutationResult> {
  try {
    return helpful
      ? await addHelpfulVote(reviewId, auth)
      : await removeHelpfulVote(reviewId, auth);
  } catch (error) {
    if (isReviewConstraintError(error)) {
      throw new ReviewInteractionError("Review interaction is no longer available.");
    }
    throw error;
  }
}

async function addHelpfulVote(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulMutationResult> {
  return getDb().transaction(async (tx) => {
    const inserted = await tx
      .insert(reviewHelpfulVotes)
      .values({ reviewId, userId: auth.user.id })
      .onConflictDoNothing()
      .returning({ reviewId: reviewHelpfulVotes.reviewId });

    return {
      changed: inserted.length > 0,
      helpful: true,
      likes: await readReviewLikeCount(tx, reviewId),
      reviewId,
    };
  });
}

async function removeHelpfulVote(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<ReviewHelpfulMutationResult> {
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

    return {
      changed: deleted.length > 0,
      helpful: false,
      likes: await readReviewLikeCount(tx, reviewId),
      reviewId,
    };
  });
}

async function readReviewLikeCount(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  reviewId: string,
): Promise<number> {
  const [current] = await tx
    .select({ value: count() })
    .from(reviewHelpfulVotes)
    .where(eq(reviewHelpfulVotes.reviewId, reviewId))
    .limit(1);

  return Number(current?.value ?? 0);
}

function isReviewConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as { code?: unknown };
  return databaseError.code === "23514";
}

function authOwnsReviewInteraction(
  review: {
    applicationEmail: string | null;
    applicationSubmittedBy: string | null;
    programCreatedBy: string | null;
    userId: string | null;
  },
  auth: ApiAuthContext,
): boolean {
  if (review.userId === auth.user.id) return true;
  if (review.programCreatedBy === auth.user.id) return true;
  if (review.applicationSubmittedBy === auth.user.id) return true;

  const applicationEmail = review.applicationEmail?.trim().toLowerCase();
  return Boolean(
    applicationEmail &&
      getVerifiedAccountEmails(auth).includes(applicationEmail),
  );
}

function getVerifiedAccountEmails(auth: ApiAuthContext): string[] {
  if (!auth.user.email_confirmed_at && !auth.user.confirmed_at) return [];

  return Array.from(
    new Set(
      [auth.user.email]
        .map((email) => String(email ?? "").trim().toLowerCase())
        .filter(isValidEmail),
    ),
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
