import { and, count, eq, inArray, isNull, ne, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewHostReplies,
  reviewReports,
  reviews as reviewsTable,
} from "@/db/schema";

export type ReviewModerationSummary = {
  draftCount: number;
  hiddenCount: number;
  openReportCount: number;
  pendingCount: number;
  publishedCount: number;
  totalCount: number;
  unansweredPublishedCount: number;
};

export async function getHostReviewModerationSummary(options: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
} = {}): Promise<ReviewModerationSummary> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) {
    return emptySummary();
  }
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) {
    return emptySummary();
  }

  const baseAccessConditions = buildReviewAccessConditions(options);
  const [
    totalCount,
    draftCount,
    pendingCount,
    publishedCount,
    hiddenCount,
    openReportCount,
    unansweredPublishedCount,
  ] = await Promise.all([
    countReviews(baseAccessConditions),
    countReviews([...baseAccessConditions, eq(reviewsTable.status, "draft")]),
    countReviews([...baseAccessConditions, eq(reviewsTable.status, "pending")]),
    countReviews([...baseAccessConditions, eq(reviewsTable.status, "published")]),
    countReviews([...baseAccessConditions, eq(reviewsTable.status, "hidden")]),
    countOpenReports(baseAccessConditions),
    countUnansweredPublished(baseAccessConditions),
  ]);

  return {
    draftCount,
    hiddenCount,
    openReportCount,
    pendingCount,
    publishedCount,
    totalCount,
    unansweredPublishedCount,
  };
}

async function countReviews(conditions: SQL[]): Promise<number> {
  const query = getDb()
    .select({ value: count() })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const [row] = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return row?.value ?? 0;
}

async function countOpenReports(reviewAccessConditions: SQL[]): Promise<number> {
  const conditions = [
    ...reviewAccessConditions,
    inArray(reviewReports.status, ["open", "reviewing"]),
  ];
  const query = getDb()
    .select({ value: count() })
    .from(reviewReports)
    .innerJoin(reviewsTable, eq(reviewReports.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const [row] = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return row?.value ?? 0;
}

async function countUnansweredPublished(reviewAccessConditions: SQL[]): Promise<number> {
  const conditions = [
    ...reviewAccessConditions,
    eq(reviewsTable.status, "published"),
    or(isNull(reviewHostReplies.id), ne(reviewHostReplies.status, "published")),
  ].filter(Boolean) as SQL[];

  const query = getDb()
    .select({ value: count() })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(reviewHostReplies, eq(reviewHostReplies.reviewId, reviewsTable.id));

  const [row] = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return row?.value ?? 0;
}

function buildReviewAccessConditions(options: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
}): SQL[] {
  const accessConditions: SQL[] = [];

  if (options.allowedVillageSlugs) {
    accessConditions.push(inArray(reviewsTable.villageSlug, options.allowedVillageSlugs));
  }
  if (options.allowedVillageIds) {
    accessConditions.push(inArray(programsTable.villageId, options.allowedVillageIds));
  }

  if (accessConditions.length === 0) return [];
  if (accessConditions.length === 1) return [accessConditions[0]];

  const accessPredicate = or(...accessConditions);
  return accessPredicate ? [accessPredicate] : [];
}

function emptySummary(): ReviewModerationSummary {
  return {
    draftCount: 0,
    hiddenCount: 0,
    openReportCount: 0,
    pendingCount: 0,
    publishedCount: 0,
    totalCount: 0,
    unansweredPublishedCount: 0,
  };
}