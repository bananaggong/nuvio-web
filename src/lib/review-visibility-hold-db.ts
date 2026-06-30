import { and, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviews as reviewsTable,
  reviewVisibilityHolds,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";

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
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewVisibilityHoldContext = {
  hold: typeof reviewVisibilityHolds.$inferSelect;
  programVillageId: string | null;
  reviewTitle: string;
  villageSlug: string | null;
};

type ReleaseVisibilityHoldInput = {
  id: string;
  note?: string | null;
  reviewId?: string;
};

type ReleaseVisibilityHoldsBySourceInput = {
  note?: string | null;
  reason?: ReviewVisibilityHoldReason;
  releaseSource: string;
  reviewId: string;
  sourceId?: string | null;
  sourceType: ReviewVisibilityHoldSourceType;
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

export class ReviewVisibilityHoldAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review visibility hold.");
    this.name = "ReviewVisibilityHoldAccessError";
  }
}

export class ReviewVisibilityHoldError extends Error {
  constructor(message = "Review visibility hold is not available.") {
    super(message);
    this.name = "ReviewVisibilityHoldError";
  }
}

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

export async function releaseHostReviewVisibilityHoldFromDb(
  input: unknown,
  options: ReviewVisibilityHoldAccessOptions = {},
): Promise<ReviewVisibilityHold> {
  const normalized = normalizeReleaseVisibilityHoldInput(input);
  const [context] = await selectHoldContexts([eq(reviewVisibilityHolds.id, normalized.id)]);
  if (!context) throw new ReviewVisibilityHoldError("Review visibility hold was not found.");
  if (normalized.reviewId && context.hold.reviewId !== normalized.reviewId) {
    throw new ReviewVisibilityHoldError("Review visibility hold was not found.");
  }

  assertHoldAccess(context, options);

  return releaseVisibilityHoldContext(context, {
    actorId: options.actorId,
    actorRole: options.actorRole,
    note: normalized.note,
    releaseSource: "host_manual_release",
  });
}

export async function releaseReviewVisibilityHoldsBySourceFromDb(
  input: ReleaseVisibilityHoldsBySourceInput,
  options: ReviewVisibilityHoldAccessOptions = {},
): Promise<ReviewVisibilityHold[]> {
  if (!isUuid(input.reviewId)) throw new ReviewVisibilityHoldError("A valid review id is required.");

  const conditions: SQL[] = [
    eq(reviewVisibilityHolds.reviewId, input.reviewId),
    eq(reviewVisibilityHolds.sourceType, input.sourceType),
  ];
  if (input.sourceId !== undefined) {
    conditions.push(
      input.sourceId === null
        ? isNull(reviewVisibilityHolds.sourceId)
        : eq(reviewVisibilityHolds.sourceId, input.sourceId),
    );
  }
  if (input.reason) conditions.push(eq(reviewVisibilityHolds.reason, input.reason));

  const contexts = await selectHoldContexts(conditions);
  const released: ReviewVisibilityHold[] = [];

  for (const context of contexts) {
    assertHoldAccess(context, options);
    const hold = await releaseVisibilityHoldContext(context, {
      actorId: options.actorId,
      actorRole: options.actorRole,
      note: input.note,
      releaseSource: input.releaseSource,
    });
    released.push(hold);
  }

  return released;
}

export async function safeReleaseReviewVisibilityHoldsBySourceFromDb(
  input: ReleaseVisibilityHoldsBySourceInput,
  options: ReviewVisibilityHoldAccessOptions = {},
): Promise<void> {
  try {
    await releaseReviewVisibilityHoldsBySourceFromDb(input, options);
  } catch {
    // Visibility hold release metadata should not break the primary moderation action.
  }
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

async function selectHoldContexts(conditions: SQL[]): Promise<ReviewVisibilityHoldContext[]> {
  const query = getDb()
    .select({
      hold: reviewVisibilityHolds,
      programVillageId: programsTable.villageId,
      reviewTitle: reviewsTable.title,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewVisibilityHolds)
    .innerJoin(reviewsTable, eq(reviewVisibilityHolds.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  return conditions.length > 0
    ? query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
    : query;
}

async function releaseVisibilityHoldContext(
  context: ReviewVisibilityHoldContext,
  input: {
    actorId?: string;
    actorRole?: string;
    note?: string | null;
    releaseSource: string;
  },
): Promise<ReviewVisibilityHold> {
  const now = new Date();
  const metadata = buildReleaseMetadata(context.hold.metadata, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    note: input.note,
    releasedAt: now.toISOString(),
    releaseSource: input.releaseSource,
  });

  const [row] = await getDb()
    .update(reviewVisibilityHolds)
    .set({
      metadata,
      releasedAt: context.hold.releasedAt ?? now,
      status: "released",
      updatedAt: now,
    })
    .where(eq(reviewVisibilityHolds.id, context.hold.id))
    .returning();

  if (!row) throw new ReviewVisibilityHoldError("Review visibility hold was not found.");

  void safeCreateAuditLog({
    action: "review.visibility_hold.release",
    actorId: input.actorId,
    entityId: row.id,
    entityType: "review_visibility_hold",
    metadata: {
      reason: row.reason,
      releaseSource: input.releaseSource,
      reviewId: row.reviewId,
      sourceId: row.sourceId,
      sourceType: row.sourceType,
    },
  });

  return mapHold(row, context.reviewTitle, context.villageSlug);
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

function assertHoldAccess(
  context: ReviewVisibilityHoldContext,
  options: ReviewVisibilityHoldAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (context.villageSlug && options.allowedVillageSlugs?.includes(context.villageSlug)) return;
  if (context.programVillageId && options.allowedVillageIds?.includes(context.programVillageId)) return;
  throw new ReviewVisibilityHoldAccessError();
}

function normalizeReleaseVisibilityHoldInput(input: unknown): ReleaseVisibilityHoldInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ReviewVisibilityHoldError("Review visibility hold payload is required.");
  }

  const value = input as Record<string, unknown>;
  const id = asUuid(value.id);
  if (!id) throw new ReviewVisibilityHoldError("A valid visibility hold id is required.");

  return {
    id,
    note: normalizeOptionalText(value.note),
    reviewId: asUuid(value.reviewId),
  };
}

function buildReleaseMetadata(
  current: unknown,
  input: {
    actorId?: string;
    actorRole?: string;
    note?: string | null;
    releasedAt: string;
    releaseSource: string;
  },
): Record<string, unknown> {
  return {
    ...asRecord(current),
    release: {
      actorId: input.actorId ?? null,
      actorRole: normalizeOptionalText(input.actorRole),
      note: normalizeOptionalText(input.note),
      releasedAt: input.releasedAt,
      source: normalizeReleaseSource(input.releaseSource),
    },
  };
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
    metadata: asRecord(row.metadata),
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

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : null;
}

function normalizeReleaseSource(value: string): string {
  const text = value.trim().replace(/[^a-z0-9_.:-]/giu, "_").slice(0, 80);
  return text || "host_manual_release";
}

function asUuid(value: unknown): string | undefined {
  return typeof value === "string" && isUuid(value.trim()) ? value.trim() : undefined;
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
