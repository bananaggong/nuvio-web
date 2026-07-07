import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programs as programsTable,
  reviewModerationChecks,
  reviews as reviewsTable,
} from "@/db/schema";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { currentReviewModerationContentPredicate } from "@/lib/review-moderation-current-db";

export type ReviewModerationRiskLevel = "low" | "medium" | "high";

export type ReviewModerationCheck = {
  checkedAt: string;
  flags: string[];
  id: string;
  matchedTerms: string[];
  metadata: Record<string, unknown>;
  reviewId: string;
  riskLevel: ReviewModerationRiskLevel;
  riskScore: number;
  updatedAt: string;
};

type ReviewModerationAccessOptions = {
  actorId?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewForModeration = {
  body: string;
  contentHash: string;
  excerpt: string;
  id: string;
  images: string[];
  programVillageId: string | null;
  source: string;
  status: string;
  title: string;
  villageSlug: string | null;
};

type ModerationAnalysis = {
  flags: string[];
  matchedTerms: string[];
  metadata: Record<string, unknown>;
  riskLevel: ReviewModerationRiskLevel;
  riskScore: number;
};

export class ReviewModerationAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review moderation check.");
    this.name = "ReviewModerationAccessError";
  }
}

export class ReviewModerationCheckError extends Error {
  constructor(message = "Review moderation check is not available.") {
    super(message);
    this.name = "ReviewModerationCheckError";
  }
}

export async function listHostReviewModerationChecksFromDb(
  options: ReviewModerationAccessOptions & {
    limit?: number;
    riskLevel?: ReviewModerationRiskLevel;
  } = {},
): Promise<ReviewModerationCheck[]> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) return [];
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) return [];

  const conditions = buildAccessConditions(options);
  conditions.push(sql`${reviewsTable.status} <> 'deleted'`);
  conditions.push(currentReviewModerationContentPredicate());
  if (options.riskLevel) {
    conditions.push(eq(reviewModerationChecks.riskLevel, options.riskLevel));
  }

  const rows = await selectModerationChecks(conditions, clampLimit(options.limit, 200));
  return rows.map((row) => mapCheck(row.check));
}

export async function getHostReviewModerationCheckFromDb(
  reviewId: string,
  options: ReviewModerationAccessOptions = {},
): Promise<ReviewModerationCheck | null> {
  const review = await getReviewForModeration(reviewId);
  if (!review) return null;
  assertAccess(review, options);

  const [row] = await getDb()
    .select()
    .from(reviewModerationChecks)
    .where(eq(reviewModerationChecks.reviewId, reviewId))
    .limit(1);

  if (row && isCurrentModerationCheck(row, review)) return mapCheck(row);
  return refreshReviewModerationCheck(reviewId, options);
}

export async function refreshReviewModerationCheck(
  reviewId: string,
  options: ReviewModerationAccessOptions = {},
): Promise<ReviewModerationCheck> {
  const review = await getReviewForModeration(reviewId);
  if (!review) throw new ReviewModerationCheckError("Review was not found.");
  assertAccess(review, options);

  const analysis = analyzeReviewModeration(review);
  const now = new Date();
  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.review_moderation_write_allowed', 'true', true)`,
    );

    return tx
      .insert(reviewModerationChecks)
      .values({
        checkedAt: now,
        checkedBy: options.actorId ?? null,
        flags: analysis.flags,
        matchedTerms: analysis.matchedTerms,
        metadata: analysis.metadata,
        reviewId,
        riskLevel: analysis.riskLevel,
        riskScore: analysis.riskScore,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: reviewModerationChecks.reviewId,
        set: {
          checkedAt: now,
          checkedBy: options.actorId ?? null,
          flags: analysis.flags,
          matchedTerms: analysis.matchedTerms,
          metadata: analysis.metadata,
          riskLevel: analysis.riskLevel,
          riskScore: analysis.riskScore,
          updatedAt: now,
        },
      })
      .returning();
  });

  void safeCreateAuditLog({
    action: "review.moderation_check.refresh",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review_moderation_check",
    metadata: {
      flags: row.flags,
      reviewId,
      riskLevel: row.riskLevel,
      riskScore: row.riskScore,
    },
  });

  return mapCheck(row);
}

export function analyzeReviewModeration(review: {
  body: string;
  contentHash?: string;
  excerpt: string;
  images?: string[];
  source?: string;
  title: string;
}): ModerationAnalysis {
  const content = `${review.title} ${review.excerpt} ${review.body}`.trim();
  const flags = new Set<string>();
  const matchedTerms = new Set<string>();
  let riskScore = 0;

  const emails = matchAll(content, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu);
  if (emails.length > 0) {
    flags.add("privacy_email");
    riskScore += 40;
    emails.slice(0, 3).map(maskEmail).forEach((term) => matchedTerms.add(term));
  }

  const phones = matchAll(
    content,
    /(?:^|[^0-9])(01[016789][^0-9]?[0-9]{3,4}[^0-9]?[0-9]{4})(?:[^0-9]|$)/gu,
    1,
  );
  if (phones.length > 0) {
    flags.add("privacy_phone");
    riskScore += 40;
    phones.slice(0, 3).map(maskPhone).forEach((term) => matchedTerms.add(term));
  }

  const links = matchAll(content, /https?:\/\/[^\s]+|www\.[^\s]+/giu);
  if (links.length > 0) {
    flags.add("external_link");
    riskScore += Math.min(30, links.length * 15);
    links.slice(0, 3).map(maskUrl).forEach((term) => matchedTerms.add(term));
  }
  if (links.length >= 3) {
    flags.add("excessive_links");
    riskScore += 20;
  }

  const socialHandles = matchAll(content, /(^|\s)(@[A-Za-z0-9_\.]{3,30})/gu, 2);
  if (socialHandles.length > 0) {
    flags.add("social_handle");
    riskScore += 15;
    socialHandles.slice(0, 3).forEach((term) => matchedTerms.add(term));
  }

  const bodyLength = review.body.trim().length;
  if (bodyLength < 30) {
    flags.add("short_content");
    riskScore += 10;
  }

  if (/[^\s]{80,}/u.test(content)) {
    flags.add("long_unbroken_text");
    riskScore += 10;
  }

  if (/(.)\1{7,}/u.test(content)) {
    flags.add("repetitive_text");
    riskScore += 15;
  }

  const imageCount = review.images?.length ?? 0;
  if (imageCount > 0 && bodyLength < 50) {
    flags.add("image_heavy_short_text");
    riskScore += 10;
  }

  riskScore = Math.min(riskScore, 100);
  const riskLevel: ReviewModerationRiskLevel = riskScore >= 50
    ? "high"
    : riskScore >= 20
      ? "medium"
      : "low";

  return {
    flags: Array.from(flags),
    matchedTerms: Array.from(matchedTerms).slice(0, 10),
    metadata: {
      characterCount: content.length,
      checkedVersion: 2,
      ...(review.contentHash ? { contentHash: review.contentHash } : {}),
      imageCount,
      linkCount: links.length,
      source: "application_service",
    },
    riskLevel,
    riskScore,
  };
}

async function selectModerationChecks(conditions: SQL[], limit: number) {
  const baseQuery = getDb()
    .select({ check: reviewModerationChecks })
    .from(reviewModerationChecks)
    .innerJoin(reviewsTable, eq(reviewModerationChecks.reviewId, reviewsTable.id))
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  return conditions.length > 0
    ? baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(reviewModerationChecks.checkedAt))
        .limit(limit)
    : baseQuery.orderBy(desc(reviewModerationChecks.checkedAt)).limit(limit);
}

async function getReviewForModeration(reviewId: string): Promise<ReviewForModeration | null> {
  if (!isUuid(reviewId)) return null;

  const [row] = await getDb()
    .select({
      body: reviewsTable.body,
      contentHash: sql<string>`public.review_moderation_content_hash(
        ${reviewsTable.title},
        ${reviewsTable.excerpt},
        ${reviewsTable.body},
        ${reviewsTable.images}
      )`,
      excerpt: reviewsTable.excerpt,
      id: reviewsTable.id,
      images: reviewsTable.images,
      programVillageId: programsTable.villageId,
      source: reviewsTable.source,
      status: reviewsTable.status,
      title: reviewsTable.title,
      villageSlug: reviewsTable.villageSlug,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(eq(reviewsTable.id, reviewId), sql`${reviewsTable.status} <> 'deleted'`))
    .limit(1);

  return row ?? null;
}

function buildAccessConditions(options: ReviewModerationAccessOptions): SQL[] {
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

function assertAccess(review: ReviewForModeration, options: ReviewModerationAccessOptions) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (review.villageSlug && options.allowedVillageSlugs?.includes(review.villageSlug)) return;
  if (review.programVillageId && options.allowedVillageIds?.includes(review.programVillageId)) return;
  throw new ReviewModerationAccessError();
}

function mapCheck(row: typeof reviewModerationChecks.$inferSelect): ReviewModerationCheck {
  return {
    checkedAt: row.checkedAt.toISOString(),
    flags: Array.isArray(row.flags) ? row.flags : [],
    id: row.id,
    matchedTerms: Array.isArray(row.matchedTerms) ? row.matchedTerms : [],
    metadata: isRecord(row.metadata) ? row.metadata : {},
    reviewId: row.reviewId,
    riskLevel: asRiskLevel(row.riskLevel),
    riskScore: row.riskScore,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isCurrentModerationCheck(
  row: typeof reviewModerationChecks.$inferSelect,
  review: ReviewForModeration,
): boolean {
  return asMetadata(row.metadata).contentHash === review.contentHash;
}

function asRiskLevel(value: string): ReviewModerationRiskLevel {
  return value === "high" || value === "medium" ? value : "low";
}

function matchAll(value: string, pattern: RegExp, group = 0): string[] {
  return Array.from(value.matchAll(pattern))
    .map((match) => match[group] ?? match[0] ?? "")
    .map((item) => item.trim())
    .filter(Boolean);
}

function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@");
  const prefix = local.slice(0, 2) || "*";
  return `${prefix}***@${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function maskUrl(value: string): string {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return `${url.hostname}/...`;
  } catch {
    return "external-link";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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
