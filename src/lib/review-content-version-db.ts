import { and, desc, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewContentVersions,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type { ReviewCategory, ReviewSource, ReviewStatus } from "@/lib/types";

export type ReviewContentVersion = {
  authorName: string;
  body: string;
  category: ReviewCategory;
  changedByRole?: string;
  changeSource: string;
  createdAt: string;
  excerpt: string;
  id: string;
  images: string[];
  metadata: Record<string, unknown>;
  rating?: number;
  reviewId: string;
  source: ReviewSource;
  status: ReviewStatus;
  title: string;
  version: number;
};

type ReviewContentVersionAccessOptions = {
  actorId?: string;
  actorRole?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewForContentVersion = {
  id: string;
  programVillageId: string | null;
  villageSlug: string | null;
};

type EnrichReviewContentVersionInput = {
  actorId?: string;
  actorRole?: string;
  changeSource: string;
  metadata?: Record<string, unknown>;
  reviewId: string;
  snapshot?: ReviewContentVersionSnapshotInput;
};

export type ReviewContentVersionSnapshotInput = {
  authorName: string;
  body: string;
  category: ReviewCategory;
  excerpt: string;
  images: string[];
  rating?: number | null;
  source: ReviewSource;
  status: ReviewStatus;
  title: string;
};

export class ReviewContentVersionAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review content version.");
    this.name = "ReviewContentVersionAccessError";
  }
}

export class ReviewContentVersionError extends Error {
  constructor(message = "Review content version is not available.") {
    super(message);
    this.name = "ReviewContentVersionError";
  }
}

export async function listHostReviewContentVersionsFromDb(
  reviewId: string,
  options: ReviewContentVersionAccessOptions & { limit?: number } = {},
): Promise<ReviewContentVersion[]> {
  const review = await getReviewForContentVersion(reviewId);
  if (!review) throw new ReviewContentVersionError("Review was not found.");
  assertAccess(review, options);

  const rows = await getDb()
    .select()
    .from(reviewContentVersions)
    .where(eq(reviewContentVersions.reviewId, reviewId))
    .orderBy(desc(reviewContentVersions.version))
    .limit(clampLimit(options.limit, 100));

  return rows.map(mapContentVersion);
}

export async function enrichLatestReviewContentVersion(
  input: EnrichReviewContentVersionInput,
  options: ReviewContentVersionAccessOptions = {},
): Promise<ReviewContentVersion | null> {
  const review = await getReviewForContentVersion(input.reviewId);
  if (!review) throw new ReviewContentVersionError("Review was not found.");
  assertAccess(review, options);

  const [recentVersion] = await getDb()
    .select()
    .from(reviewContentVersions)
    .where(
      and(
        eq(reviewContentVersions.reviewId, input.reviewId),
        isNull(reviewContentVersions.changedBy),
        isNull(reviewContentVersions.changedByRole),
        eq(reviewContentVersions.changeSource, "database_trigger"),
        sql`${reviewContentVersions.metadata}->>'source' = 'database_trigger'`,
        sql`not (${reviewContentVersions.metadata} ? 'enrichedBy')`,
        gte(reviewContentVersions.createdAt, new Date(Date.now() - 60_000)),
        ...buildSnapshotConditions(input.snapshot),
      ),
    )
    .orderBy(desc(reviewContentVersions.version))
    .limit(1);

  if (!recentVersion) return null;

  const actorId = input.actorId ?? options.actorId ?? null;
  const actorRole = normalizeOptionalText(input.actorRole ?? options.actorRole);
  const metadata = {
    ...asRecord(recentVersion.metadata),
    ...sanitizeMetadata(input.metadata),
    enrichedBy: "application_service",
  };

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_audit_enrich_allowed', 'true', true)`);

    return tx
      .update(reviewContentVersions)
      .set({
        changedBy: actorId,
        changedByRole: actorRole,
        changeSource: normalizeChangeSource(input.changeSource),
        metadata,
      })
      .where(
        and(
          eq(reviewContentVersions.id, recentVersion.id),
          isNull(reviewContentVersions.changedBy),
          isNull(reviewContentVersions.changedByRole),
          eq(reviewContentVersions.changeSource, "database_trigger"),
          sql`${reviewContentVersions.metadata}->>'source' = 'database_trigger'`,
          sql`not (${reviewContentVersions.metadata} ? 'enrichedBy')`,
        ),
      )
      .returning();
  });

  if (!row) return null;

  void safeCreateAuditLog({
    action: "review.content_version.enrich",
    actorId,
    entityId: row.id,
    entityType: "review_content_version",
    metadata: {
      changeSource: row.changeSource,
      reviewId: row.reviewId,
      version: row.version,
    },
  });

  return mapContentVersion(row);
}

export async function safeEnrichLatestReviewContentVersion(
  input: EnrichReviewContentVersionInput,
  options: ReviewContentVersionAccessOptions = {},
): Promise<void> {
  try {
    await enrichLatestReviewContentVersion(input, options);
  } catch {
    // Content version enrichment should never break the primary review action.
  }
}

async function getReviewForContentVersion(
  reviewId: string,
): Promise<ReviewForContentVersion | null> {
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
  review: ReviewForContentVersion,
  options: ReviewContentVersionAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (review.villageSlug && options.allowedVillageSlugs?.includes(review.villageSlug)) return;
  if (review.programVillageId && options.allowedVillageIds?.includes(review.programVillageId)) return;
  throw new ReviewContentVersionAccessError();
}

function mapContentVersion(
  row: typeof reviewContentVersions.$inferSelect,
): ReviewContentVersion {
  return {
    authorName: row.authorName,
    body: row.body,
    category: row.category,
    changedByRole: row.changedByRole ?? undefined,
    changeSource: row.changeSource,
    createdAt: row.createdAt.toISOString(),
    excerpt: row.excerpt,
    id: row.id,
    images: Array.isArray(row.images) ? row.images : [],
    metadata: sanitizeContentVersionMetadata(row.metadata),
    rating: row.rating ?? undefined,
    reviewId: row.reviewId,
    source: asReviewSource(row.source),
    status: row.status,
    title: row.title,
    version: row.version,
  };
}

function asReviewSource(value: string): ReviewSource {
  return value === "participant" || value === "admin" || value === "imported"
    ? value
    : "host";
}

function sanitizeContentVersionMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  const safe: Record<string, unknown> = {};

  copyString(metadata, safe, "source");
  copyString(metadata, safe, "enrichedBy");
  copyString(metadata, safe, "reviewSource");

  return safe;
}

function copyString(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  if (typeof source[key] === "string") target[key] = source[key];
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  return {
    ...metadata,
    source: typeof metadata.source === "string" ? metadata.source : "application_service",
  };
}

function buildSnapshotConditions(
  snapshot: ReviewContentVersionSnapshotInput | undefined,
): SQL[] {
  if (!snapshot) return [];

  return [
    eq(reviewContentVersions.title, snapshot.title),
    eq(reviewContentVersions.category, snapshot.category),
    eq(reviewContentVersions.authorName, snapshot.authorName),
    eq(reviewContentVersions.excerpt, snapshot.excerpt),
    eq(reviewContentVersions.body, snapshot.body),
    sql`${reviewContentVersions.images} = ${JSON.stringify(snapshot.images)}::jsonb`,
    snapshot.rating == null
      ? isNull(reviewContentVersions.rating)
      : eq(reviewContentVersions.rating, snapshot.rating),
    eq(reviewContentVersions.source, snapshot.source),
    eq(reviewContentVersions.status, snapshot.status),
  ];
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : null;
}

function normalizeChangeSource(value: string): string {
  const text = value.trim().replace(/[^a-z0-9_.:-]/giu, "_").slice(0, 80);
  return text || "application_service";
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
