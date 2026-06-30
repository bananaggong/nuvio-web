import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviews as reviewsTable,
  reviewVisibilityHolds,
} from "@/db/schema";

export type ReviewVisibilityHoldReason =
  | "high_risk_moderation"
  | "privacy_report"
  | "inappropriate_report"
  | "spam_report";

export type ReviewVisibilityHoldSourceType =
  | "moderation_check"
  | "review_report"
  | "system";

export type ReviewVisibilityHoldStatus = "active" | "released";

export type ReviewVisibilityHold = {
  createdAt: string;
  heldAt: string;
  id: string;
  metadata: Record<string, unknown>;
  reason: ReviewVisibilityHoldReason;
  releasedAt?: string;
  reviewId: string;
  reviewTitle: string;
  sourceId?: string;
  sourceType: ReviewVisibilityHoldSourceType;
  status: ReviewVisibilityHoldStatus;
  updatedAt: string;
  villageSlug?: string;
};

type ReviewVisibilityHoldAccessOptions = {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

const holdReasons: ReviewVisibilityHoldReason[] = [
  "high_risk_moderation",
  "privacy_report",
  "inappropriate_report",
  "spam_report",
];
const holdStatuses: ReviewVisibilityHoldStatus[] = ["active", "released"];
const holdSourceTypes: ReviewVisibilityHoldSourceType[] = [
  "moderation_check",
  "review_report",
  "system",
];

export async function listHostReviewVisibilityHoldsFromDb(
  options: ReviewVisibilityHoldAccessOptions & {
    limit?: number;
    reason?: ReviewVisibilityHoldReason;
    reviewId?: string;
    status?: ReviewVisibilityHoldStatus;
  } = {},
): Promise<ReviewVisibilityHold[]> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) return [];
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) return [];
  if (options.reviewId && !isUuid(options.reviewId)) return [];

  const conditions = buildAccessConditions(options);
  if (options.reviewId) conditions.push(eq(reviewVisibilityHolds.reviewId, options.reviewId));
  if (options.status) conditions.push(eq(reviewVisibilityHolds.status, options.status));
  if (options.reason) conditions.push(eq(reviewVisibilityHolds.reason, options.reason));

  const baseQuery = getDb()
    .select({
      hold: reviewVisibilityHolds,
      reviewTitle: reviewsTable.title,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewVisibilityHolds)
    .innerJoin(reviewsTable, eq(reviewVisibilityHolds.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const rows = conditions.length > 0
    ? await baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(reviewVisibilityHolds.heldAt), desc(reviewVisibilityHolds.createdAt))
        .limit(clampLimit(options.limit, 100))
    : await baseQuery
        .orderBy(desc(reviewVisibilityHolds.heldAt), desc(reviewVisibilityHolds.createdAt))
        .limit(clampLimit(options.limit, 100));

  return rows.map((row) => mapHold(row.hold, row.reviewTitle, row.villageSlug));
}

export function asVisibilityHoldReason(
  value: unknown,
): ReviewVisibilityHoldReason | undefined {
  return holdReasons.includes(value as ReviewVisibilityHoldReason)
    ? (value as ReviewVisibilityHoldReason)
    : undefined;
}

export function asVisibilityHoldStatus(
  value: unknown,
): ReviewVisibilityHoldStatus | undefined {
  return holdStatuses.includes(value as ReviewVisibilityHoldStatus)
    ? (value as ReviewVisibilityHoldStatus)
    : undefined;
}

function buildAccessConditions(options: ReviewVisibilityHoldAccessOptions): SQL[] {
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

function mapHold(
  row: typeof reviewVisibilityHolds.$inferSelect,
  reviewTitle: string,
  villageSlug: string | null,
): ReviewVisibilityHold {
  return {
    createdAt: row.createdAt.toISOString(),
    heldAt: row.heldAt.toISOString(),
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    reason: asReason(row.reason),
    releasedAt: row.releasedAt?.toISOString(),
    reviewId: row.reviewId,
    reviewTitle,
    sourceId: row.sourceId ?? undefined,
    sourceType: asSourceType(row.sourceType),
    status: asStatus(row.status),
    updatedAt: row.updatedAt.toISOString(),
    villageSlug: villageSlug ?? undefined,
  };
}

function asReason(value: string): ReviewVisibilityHoldReason {
  return asVisibilityHoldReason(value) ?? "high_risk_moderation";
}

function asSourceType(value: string): ReviewVisibilityHoldSourceType {
  return holdSourceTypes.includes(value as ReviewVisibilityHoldSourceType)
    ? (value as ReviewVisibilityHoldSourceType)
    : "system";
}

function asStatus(value: string): ReviewVisibilityHoldStatus {
  return asVisibilityHoldStatus(value) ?? "active";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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