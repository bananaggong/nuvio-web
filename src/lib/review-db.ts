import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable, reviews as reviewsTable } from "@/db/schema";
import type { Review, ReviewCategory } from "@/lib/types";

export type HostReviewDraft = {
  id: string;
  title: string;
  category: ReviewCategory;
  programLegacyId?: number;
  villageSlug?: string;
  author: string;
  excerpt: string;
  body: string;
  badge?: string;
  published: boolean;
  updatedAt: string;
};

type UpsertHostReviewDraftOptions = {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

type ReviewRow = typeof reviewsTable.$inferSelect;
type ReviewInsert = typeof reviewsTable.$inferInsert;

export class HostReviewAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review.");
    this.name = "HostReviewAccessError";
  }
}

const reviewCategories: ReviewCategory[] = [
  "programTip",
  "selected",
  "rejected",
  "trip",
  "free",
  "question",
];

export async function listPublicReviewsFromDb(): Promise<Review[]> {
  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewsTable.status, "published"))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(300);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToReview(review, programLegacyId ?? undefined),
  );
}

export async function listPublicProgramReviewsFromDb(
  programIdentifier: number | string,
  limit = 80,
): Promise<Review[]> {
  const key = String(programIdentifier).trim();
  const numericId = Number(key);
  const programPredicate = Number.isInteger(numericId)
    ? eq(programsTable.legacyId, numericId)
    : eq(programsTable.slug, key);

  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(eq(reviewsTable.status, "published"), programPredicate))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToReview(review, programLegacyId ?? undefined),
  );
}

export async function listHostReviewDraftsFromDb(
  options: { villageSlugs?: string[] } = {},
): Promise<HostReviewDraft[]> {
  const villageSlugs = options.villageSlugs
    ? Array.from(new Set(options.villageSlugs.map((slug) => slug.trim()).filter(Boolean)))
    : undefined;

  if (villageSlugs && villageSlugs.length === 0) return [];

  const baseQuery = getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const rows = villageSlugs
    ? await baseQuery
        .where(inArray(reviewsTable.villageSlug, villageSlugs))
        .orderBy(desc(reviewsTable.updatedAt))
        .limit(300)
    : await baseQuery.orderBy(desc(reviewsTable.updatedAt)).limit(300);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToHostDraft(review, programLegacyId ?? undefined),
  );
}

export async function upsertHostReviewDraft(
  draft: HostReviewDraft,
  options: UpsertHostReviewDraftOptions = {},
): Promise<HostReviewDraft> {
  const allowedVillageSlugs = normalizeAllowedValues(options.allowedVillageSlugs);
  const allowedVillageIds = normalizeAllowedValues(options.allowedVillageIds);
  if (options.allowedVillageSlugs && allowedVillageSlugs?.length === 0) {
    throw new HostReviewAccessError();
  }
  if (options.allowedVillageIds && allowedVillageIds?.length === 0) {
    throw new HostReviewAccessError();
  }

  const insertValue = await mapHostDraftToReviewInsert(draft, {
    allowedVillageIds,
  });
  const now = new Date();

  if (isUuid(draft.id)) {
    const [existingRow] = await getDb()
      .select({
        id: reviewsTable.id,
        villageSlug: reviewsTable.villageSlug,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.id, draft.id))
      .limit(1);

    if (existingRow) {
      assertReviewVillageAccess(existingRow.villageSlug, allowedVillageSlugs);
    }

    const [updatedRow] = await getDb()
      .update(reviewsTable)
      .set({ ...insertValue, updatedAt: now })
      .where(
        allowedVillageSlugs
          ? and(
              eq(reviewsTable.id, draft.id),
              inArray(reviewsTable.villageSlug, allowedVillageSlugs),
            )
          : eq(reviewsTable.id, draft.id),
      )
      .returning();

    if (updatedRow) {
      return mapReviewRowToHostDraft(updatedRow, draft.programLegacyId);
    }
  }

  assertReviewVillageAccess(insertValue.villageSlug, allowedVillageSlugs);

  const [row] = await getDb().insert(reviewsTable).values(insertValue).returning();
  return mapReviewRowToHostDraft(row, draft.programLegacyId);
}

export function normalizeHostReviewDraft(input: unknown): HostReviewDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review payload is required.");
  }

  const value = input as Record<string, unknown>;
  const body = asString(value.body);
  const excerpt = asString(value.excerpt) || body.slice(0, 120);
  const title = asString(value.title) || excerpt.slice(0, 40) || "참여 후기";

  return {
    id: asString(value.id) || `review-${Date.now()}`,
    title,
    category: asReviewCategory(value.category),
    programLegacyId: asOptionalNumber(value.programLegacyId),
    villageSlug: asOptionalString(value.villageSlug),
    author: maskKoreanName(asString(value.author) || "익명"),
    excerpt,
    body,
    badge: asOptionalString(value.badge),
    published: value.published !== false,
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

export function maskKoreanName(value: string): string {
  return value.replace(/[가-힣]{2,4}/gu, (name) => {
    if (name.length === 2) return `${name[0]}*`;
    return `${name[0]}*${name[name.length - 1]}`;
  });
}

async function mapHostDraftToReviewInsert(
  draft: HostReviewDraft,
  options: { allowedVillageIds?: string[] } = {},
): Promise<ReviewInsert> {
  return {
    programId: draft.programLegacyId
      ? await resolveProgramUuidByLegacyId(draft.programLegacyId, {
          allowedVillageIds: options.allowedVillageIds,
        })
      : null,
    villageSlug: draft.villageSlug?.trim() || null,
    title: draft.title.trim() || "참여 후기",
    category: draft.category,
    authorName: maskKoreanName(draft.author.trim() || "익명"),
    excerpt: draft.excerpt.trim() || draft.body.trim().slice(0, 120),
    body: draft.body.trim() || draft.excerpt.trim(),
    images: [],
    likes: 0,
    comments: 0,
    badge: draft.badge?.trim() || null,
    status: draft.published ? "published" : "draft",
  };
}

async function resolveProgramUuidByLegacyId(
  legacyId: number,
  options: { allowedVillageIds?: string[] } = {},
): Promise<string | null> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) {
    throw new HostReviewAccessError();
  }

  const conditions = [eq(programsTable.legacyId, legacyId)];
  if (options.allowedVillageIds) {
    conditions.push(inArray(programsTable.villageId, options.allowedVillageIds));
  }

  const [row] = await getDb()
    .select({ id: programsTable.id })
    .from(programsTable)
    .where(and(...conditions))
    .limit(1);

  if (!row && options.allowedVillageIds) {
    throw new HostReviewAccessError();
  }

  return row?.id ?? null;
}

function mapReviewRowToReview(
  row: ReviewRow,
  programLegacyId?: number,
): Review {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    programId: programLegacyId,
    villageSlug: row.villageSlug ?? undefined,
    author: row.authorName,
    date: row.createdAt.toISOString(),
    excerpt: row.excerpt,
    body: row.body,
    images: row.images,
    likes: row.likes,
    comments: row.comments,
    badge: row.badge ?? undefined,
  };
}

function mapReviewRowToHostDraft(
  row: ReviewRow,
  programLegacyId?: number,
): HostReviewDraft {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    programLegacyId,
    villageSlug: row.villageSlug ?? undefined,
    author: row.authorName,
    excerpt: row.excerpt,
    body: row.body,
    badge: row.badge ?? undefined,
    published: row.status === "published",
    updatedAt: row.updatedAt.toISOString(),
  };
}

function asReviewCategory(value: unknown): ReviewCategory {
  const text = asString(value);
  return reviewCategories.includes(text as ReviewCategory)
    ? (text as ReviewCategory)
    : "trip";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text || undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeAllowedValues(
  values: string[] | undefined,
): string[] | undefined {
  return values
    ? Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    : undefined;
}

function assertReviewVillageAccess(
  villageSlug: string | null | undefined,
  allowedVillageSlugs: string[] | undefined,
) {
  if (!allowedVillageSlugs) return;
  if (!villageSlug || !allowedVillageSlugs.includes(villageSlug)) {
    throw new HostReviewAccessError();
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
