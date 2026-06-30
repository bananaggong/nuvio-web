import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplications,
  programs as programsTable,
  reviews as reviewsTable,
  villages,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import type { ReviewStatus } from "@/lib/types";

export type ReviewEligibilityReason =
  | "already_submitted"
  | "eligible"
  | "not_found"
  | "status_not_eligible";

export type ReviewEligibility = {
  applicationId: string;
  eligible: boolean;
  existingReview?: {
    id: string;
    publishedAt?: string;
    status: ReviewStatus;
    submittedAt?: string;
    updatedAt: string;
  };
  programId: string;
  programRunId?: string;
  programSlug?: string;
  programTitle: string;
  reason: ReviewEligibilityReason;
  reviewSubmitted: boolean;
  status: string;
  villageSlug?: string;
  writeUrl?: string;
};

const participantReviewStatuses = new Set(["accepted", "checkedIn", "completed"]);

export async function listMyReviewEligibilitiesFromDb(
  auth: ApiAuthContext,
  options: { applicationId?: string; limit?: number } = {},
): Promise<ReviewEligibility[]> {
  const ownerPredicate = buildApplicationOwnerPredicate(auth);
  if (!ownerPredicate) return [];

  const conditions: SQL[] = [ownerPredicate];
  if (options.applicationId) {
    if (!isUuid(options.applicationId)) return [];
    conditions.push(eq(programApplications.id, options.applicationId));
  }

  const rows = await getDb()
    .select({
      applicationId: programApplications.id,
      programId: programApplications.programId,
      programRunId: programApplications.programRunId,
      programSlug: programsTable.slug,
      programTitle: programsTable.title,
      reviewId: reviewsTable.id,
      reviewPublishedAt: reviewsTable.publishedAt,
      reviewStatus: reviewsTable.status,
      reviewSubmitted: programApplications.reviewSubmitted,
      reviewSubmittedAt: reviewsTable.submittedAt,
      reviewUpdatedAt: reviewsTable.updatedAt,
      status: programApplications.status,
      villageSlug: villages.slug,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .leftJoin(
      reviewsTable,
      and(
        eq(reviewsTable.applicationId, programApplications.id),
        sql`${reviewsTable.status} <> 'deleted'`,
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(programApplications.submittedAt))
    .limit(clampLimit(options.limit, options.applicationId ? 1 : 100));

  return rows.map((row) => {
    const existingReview =
      row.reviewId && row.reviewStatus && row.reviewUpdatedAt
        ? {
            id: row.reviewId,
            publishedAt: row.reviewPublishedAt?.toISOString(),
            status: row.reviewStatus,
            submittedAt: row.reviewSubmittedAt?.toISOString(),
            updatedAt: row.reviewUpdatedAt.toISOString(),
          }
        : undefined;
    const hasReview = Boolean(existingReview);
    const eligibleStatus = participantReviewStatuses.has(row.status);
    const eligible = eligibleStatus && !hasReview;
    const reason: ReviewEligibilityReason = hasReview
      ? "already_submitted"
      : eligibleStatus
        ? "eligible"
        : "status_not_eligible";

    return {
      applicationId: row.applicationId,
      eligible,
      existingReview,
      programId: row.programId,
      programRunId: row.programRunId ?? undefined,
      programSlug: row.programSlug ?? undefined,
      programTitle: row.programTitle ?? "",
      reason,
      reviewSubmitted: row.reviewSubmitted,
      status: row.status,
      villageSlug: row.villageSlug ?? undefined,
      writeUrl: eligible ? `/reviews/new?applicationId=${row.applicationId}` : undefined,
    };
  });
}

export async function getMyReviewEligibilityFromDb(
  applicationId: string,
  auth: ApiAuthContext,
): Promise<ReviewEligibility | null> {
  const [eligibility] = await listMyReviewEligibilitiesFromDb(auth, {
    applicationId,
    limit: 1,
  });

  return eligibility ?? null;
}

function buildApplicationOwnerPredicate(auth: ApiAuthContext): SQL | undefined {
  const ownerConditions: SQL[] = [eq(programApplications.submittedBy, auth.user.id)];
  const emails = getVerifiedAccountEmails(auth);

  if (emails.length > 0) {
    ownerConditions.push(inArray(programApplications.email, emails));
  }

  return or(...ownerConditions);
}

function getVerifiedAccountEmails(auth: ApiAuthContext): string[] {
  return Array.from(
    new Set(
      [auth.user.email, auth.profile.email]
        .map((email) => String(email ?? "").trim().toLowerCase())
        .filter(isValidEmail),
    ),
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
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
