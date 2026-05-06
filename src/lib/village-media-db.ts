import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villageMediaContents as mediaTable } from "@/db/schema";
import { boseongMediaSeeds } from "@/lib/village-media-seeds";
import type { VillageMediaCategory, VillageMediaContent } from "@/lib/types";

export type HostVillageMediaDraft = {
  id: string;
  villageSlug: string;
  title: string;
  category: VillageMediaCategory;
  summary: string;
  body: string[];
  thumbnail: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
};

type MediaRow = typeof mediaTable.$inferSelect;
type MediaInsert = typeof mediaTable.$inferInsert;

const mediaCategories: VillageMediaCategory[] = [
  "original",
  "broadcast",
  "archive",
];

export async function listPublicVillageMedia(
  villageSlug: string,
  options: { limit?: number } = {},
): Promise<VillageMediaContent[]> {
  const slug = villageSlug.trim().toLowerCase();
  const seeds = listSeedMedia(slug);

  try {
    const rows = await getDb()
      .select()
      .from(mediaTable)
      .where(and(eq(mediaTable.villageSlug, slug), isNotNull(mediaTable.publishedAt)))
      .orderBy(desc(mediaTable.publishedAt), desc(mediaTable.updatedAt))
      .limit(200);

    return applyLimit(mergeMedia(rows.map(mapMediaRowToContent), seeds), options.limit);
  } catch {
    return applyLimit(seeds, options.limit);
  }
}

export async function listHostVillageMediaFromDb(
  villageSlug = "boseong",
): Promise<HostVillageMediaDraft[]> {
  const slug = villageSlug.trim().toLowerCase();

  try {
    const rows = await getDb()
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.villageSlug, slug))
      .orderBy(desc(mediaTable.updatedAt))
      .limit(300);

    return rows.map(mapMediaRowToHostDraft);
  } catch {
    return listSeedMedia(slug).map(mapContentToHostDraft);
  }
}

export async function upsertHostVillageMediaDraft(
  draft: HostVillageMediaDraft,
): Promise<HostVillageMediaDraft> {
  const insertValue = mapHostDraftToMediaInsert(draft);
  const now = new Date();

  if (isUuid(draft.id)) {
    const [updatedRow] = await getDb()
      .update(mediaTable)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(mediaTable.id, draft.id))
      .returning();

    if (updatedRow) return mapMediaRowToHostDraft(updatedRow);
  }

  const [row] = await getDb().insert(mediaTable).values(insertValue).returning();
  return mapMediaRowToHostDraft(row);
}

export function normalizeHostVillageMediaDraft(
  input: unknown,
): HostVillageMediaDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Media payload is required.");
  }

  const value = input as Record<string, unknown>;
  const body = normalizeBody(value.body);
  const summary =
    asString(value.summary) ||
    body[0] ||
    "전체차LAB의 활동을 기록한 미디어 콘텐츠입니다.";
  const now = new Date().toISOString();

  return {
    id: asString(value.id) || `media-${Date.now()}`,
    villageSlug: createSlug(asString(value.villageSlug) || "boseong"),
    title: asString(value.title) || "전체차LAB 미디어",
    category: asMediaCategory(value.category),
    summary,
    body,
    thumbnail: asString(value.thumbnail) || asString(value.thumbnailUrl) || "",
    sourceName: asString(value.sourceName) || "전체차LAB",
    sourceUrl: asString(value.sourceUrl) || "https://nuvio.kr/boseong/media",
    date: normalizeDate(asString(value.date) || asString(value.publishedAt)),
    featured: Boolean(value.featured),
    published: value.published !== false,
    updatedAt: asString(value.updatedAt) || now,
  };
}

function mapHostDraftToMediaInsert(draft: HostVillageMediaDraft): MediaInsert {
  const publishedDate = normalizeDate(draft.date);

  return {
    villageSlug: createSlug(draft.villageSlug),
    title: draft.title.trim() || "전체차LAB 미디어",
    category: draft.category,
    summary: draft.summary.trim(),
    body: draft.body.length > 0 ? draft.body : [draft.summary.trim()],
    thumbnailUrl: draft.thumbnail.trim(),
    sourceName: draft.sourceName.trim() || "전체차LAB",
    sourceUrl: draft.sourceUrl.trim() || "https://nuvio.kr/boseong/media",
    featured: draft.featured,
    publishedAt: draft.published ? new Date(publishedDate) : null,
  };
}

function mapMediaRowToContent(row: MediaRow): VillageMediaContent {
  return {
    id: row.id,
    villageSlug: row.villageSlug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    body: row.body,
    thumbnail: row.thumbnailUrl,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    date: (row.publishedAt ?? row.createdAt).toISOString(),
    featured: row.featured,
    published: Boolean(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMediaRowToHostDraft(row: MediaRow): HostVillageMediaDraft {
  return {
    id: row.id,
    villageSlug: row.villageSlug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    body: row.body,
    thumbnail: row.thumbnailUrl,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    date: (row.publishedAt ?? row.createdAt).toISOString().slice(0, 10),
    featured: row.featured,
    published: Boolean(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapContentToHostDraft(
  content: VillageMediaContent,
): HostVillageMediaDraft {
  return {
    id: content.id,
    villageSlug: content.villageSlug,
    title: content.title,
    category: content.category,
    summary: content.summary,
    body: content.body,
    thumbnail: content.thumbnail,
    sourceName: content.sourceName,
    sourceUrl: content.sourceUrl,
    date: content.date.slice(0, 10),
    featured: Boolean(content.featured),
    published: content.published,
    updatedAt: content.updatedAt,
  };
}

function listSeedMedia(villageSlug: string): VillageMediaContent[] {
  return boseongMediaSeeds
    .filter((content) => content.villageSlug === villageSlug && content.published)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

function mergeMedia(
  databaseMedia: VillageMediaContent[],
  seedMedia: VillageMediaContent[],
): VillageMediaContent[] {
  return [...databaseMedia, ...seedMedia]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter(
      (content, index, list) =>
        list.findIndex((item) => String(item.id) === String(content.id)) === index,
    );
}

function applyLimit(
  media: VillageMediaContent[],
  limit?: number,
): VillageMediaContent[] {
  return typeof limit === "number" ? media.slice(0, limit) : media;
}

function asMediaCategory(value: unknown): VillageMediaCategory {
  const text = asString(value);
  return mediaCategories.includes(text as VillageMediaCategory)
    ? (text as VillageMediaCategory)
    : "original";
}

function normalizeBody(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  const text = asString(value);
  return text
    ? text
        .split(/\n{2,}/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function normalizeDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed)
    ? new Date().toISOString().slice(0, 10)
    : new Date(parsed).toISOString().slice(0, 10);
}

function createSlug(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
