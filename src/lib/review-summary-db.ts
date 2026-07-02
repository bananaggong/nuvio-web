import { and, count, eq, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewHostReplies,
  reviews as reviewsTable,
  villages,
} from "@/db/schema";
import { buildPublicReviewVisibilityConditions } from "@/lib/review-public-visibility-db";

export type PublicReviewSummary = {
  averageRating: number | null;
  helpfulCount: number;
  hostReplyCount: number;
  imageReviewCount: number;
  latestPublishedAt?: string;
  ratingCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviewCount: number;
  scope: {
    programIdentifier?: string;
    type: "all" | "program" | "village";
    villageSlug?: string;
  };
};

export async function getPublicReviewSummaryFromDb(options: {
  programIdentifier?: string;
  villageSlug?: string;
} = {}): Promise<PublicReviewSummary> {
  const conditions = buildPublicReviewConditions(options);
  const whereClause = and(...conditions);

  const [summaryRow] = await getDb()
    .select({
      averageRating: sql<string | null>`avg(${reviewsTable.rating})`,
      helpfulCount: sql<number>`coalesce(sum(${reviewsTable.likes}), 0)`,
      imageReviewCount: sql<number>`count(*) filter (where jsonb_array_length(${reviewsTable.images}) > 0)`,
      latestPublishedAt: sql<Date | null>`max(${reviewsTable.publishedAt})`,
      ratingCount: sql<number>`count(${reviewsTable.rating})`,
      reviewCount: count(),
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .where(whereClause);

  const [ratingRows, hostReplyCount] = await Promise.all([
    getDb()
      .select({
        rating: reviewsTable.rating,
        value: count(),
      })
      .from(reviewsTable)
      .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
      .leftJoin(villages, eq(programsTable.villageId, villages.id))
      .where(and(whereClause, sql`${reviewsTable.rating} between 1 and 5`))
      .groupBy(reviewsTable.rating),
    countPublishedHostReplies(conditions),
  ]);

  const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const row of ratingRows) {
    if (row.rating && row.rating >= 1 && row.rating <= 5) {
      ratingDistribution[row.rating as 1 | 2 | 3 | 4 | 5] = toNumber(row.value);
    }
  }

  return {
    averageRating: normalizeAverage(summaryRow?.averageRating ?? null),
    helpfulCount: toNumber(summaryRow?.helpfulCount),
    hostReplyCount,
    imageReviewCount: toNumber(summaryRow?.imageReviewCount),
    latestPublishedAt: summaryRow?.latestPublishedAt?.toISOString(),
    ratingCount: toNumber(summaryRow?.ratingCount),
    ratingDistribution,
    reviewCount: toNumber(summaryRow?.reviewCount),
    scope: {
      programIdentifier: options.programIdentifier,
      type: options.programIdentifier
        ? "program"
        : options.villageSlug
          ? "village"
          : "all",
      villageSlug: options.villageSlug,
    },
  };
}

function buildPublicReviewConditions(options: {
  programIdentifier?: string;
  villageSlug?: string;
}): SQL[] {
  const conditions: SQL[] = buildPublicReviewVisibilityConditions();
  const programIdentifier = options.programIdentifier?.trim();
  const villageSlug = options.villageSlug?.trim();

  if (programIdentifier) {
    conditions.push(buildProgramIdentifierPredicate(programIdentifier));
  }

  if (villageSlug) {
    const villagePredicate = or(
      eq(reviewsTable.villageSlug, villageSlug),
      eq(villages.slug, villageSlug),
    );
    if (villagePredicate) conditions.push(villagePredicate);
  }

  return conditions;
}

async function countPublishedHostReplies(reviewConditions: SQL[]): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(reviewHostReplies)
    .innerJoin(reviewsTable, eq(reviewHostReplies.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .where(and(...reviewConditions, eq(reviewHostReplies.status, "published")));

  return toNumber(row?.value);
}

function buildProgramIdentifierPredicate(programIdentifier: string): SQL {
  const key = programIdentifier.trim();
  if (isUuid(key)) return eq(programsTable.id, key);

  const numericId = Number(key);
  return Number.isInteger(numericId)
    ? eq(programsTable.legacyId, numericId)
    : eq(programsTable.slug, key);
}

function normalizeAverage(value: string | number | null): number | null {
  if (value === null) return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.round(numberValue * 10) / 10;
}

function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
