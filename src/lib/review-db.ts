import { desc, eq } from "drizzle-orm";
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

type ReviewRow = typeof reviewsTable.$inferSelect;
type ReviewInsert = typeof reviewsTable.$inferInsert;

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

export async function listHostReviewDraftsFromDb(): Promise<HostReviewDraft[]> {
  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .orderBy(desc(reviewsTable.updatedAt))
    .limit(300);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToHostDraft(review, programLegacyId ?? undefined),
  );
}

export async function upsertHostReviewDraft(
  draft: HostReviewDraft,
): Promise<HostReviewDraft> {
  const insertValue = await mapHostDraftToReviewInsert(draft);
  const now = new Date();

  if (isUuid(draft.id)) {
    const [updatedRow] = await getDb()
      .update(reviewsTable)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(reviewsTable.id, draft.id))
      .returning();

    if (updatedRow) {
      return mapReviewRowToHostDraft(updatedRow, draft.programLegacyId);
    }
  }

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
): Promise<ReviewInsert> {
  return {
    programId: draft.programLegacyId
      ? await resolveProgramUuidByLegacyId(draft.programLegacyId)
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
): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: programsTable.id })
    .from(programsTable)
    .where(eq(programsTable.legacyId, legacyId))
    .limit(1);

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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
