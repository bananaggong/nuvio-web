import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villageMediaContents as mediaTable } from "@/db/schema";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import {
  excerptFromHtml,
  hasMagazineContent,
  sanitizeMagazineHtml,
} from "@/lib/magazine-content";
import {
  trySanitizeHttpUrl,
  trySanitizePublicImageUrl,
} from "@/lib/url-security";
import { boseongMediaSeeds } from "@/lib/village-media-seeds";
import type {
  VillageMediaCategory,
  VillageMediaContent,
  VillageMediaProvider,
} from "@/lib/types";

export type HostVillageMediaDraft = {
  id: string;
  villageSlug: string;
  title: string;
  category: VillageMediaCategory;
  provider: VillageMediaProvider;
  summary: string;
  body: string[];
  thumbnail: string;
  images: string[];
  imageUrls: string[];
  embedUrl?: string;
  sourceName: string;
  sourceUrl: string;
  createdAt: string;
  date: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
};

type MediaRow = typeof mediaTable.$inferSelect;
type MediaInsert = typeof mediaTable.$inferInsert;

type VillageMediaMutationOptions = {
  allowedVillageSlug?: string;
};

export class VillageMediaAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this channel media.");
    this.name = "VillageMediaAccessError";
  }
}

const mediaCategories: VillageMediaCategory[] = [
  "original",
  "broadcast",
  "archive",
];
const mediaProviders: VillageMediaProvider[] = [
  "youtube",
  "instagram",
  "naver",
  "imweb",
  "link",
  "video",
];

const mediaDisplayTimestamp = sql<Date>`coalesce(${mediaTable.publishedAt}, ${mediaTable.createdAt})`;

export async function listPublicVillageMedia(
  villageSlug: string,
  options: { limit?: number } = {},
): Promise<VillageMediaContent[]> {
  const slug = villageSlug.trim().toLowerCase();
  const seeds = isDemoModeEnabled() ? listSeedMedia(slug) : [];

  try {
    const rows = await getDb()
      .select()
      .from(mediaTable)
      .where(and(eq(mediaTable.villageSlug, slug), isNotNull(mediaTable.publishedAt)))
      .orderBy(desc(mediaDisplayTimestamp), desc(mediaTable.createdAt), desc(mediaTable.id))
      .limit(200);

    const databaseMedia = rows.map(mapMediaRowToContent);
    return applyLimit(
      databaseMedia.length > 0 ? mergeMedia(databaseMedia, seeds) : seeds,
      options.limit,
    );
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
      .orderBy(desc(mediaDisplayTimestamp), desc(mediaTable.createdAt), desc(mediaTable.id))
      .limit(300);

    if (rows.length > 0) return rows.map(mapMediaRowToHostDraft);
    return isDemoModeEnabled() ? listSeedMedia(slug).map(mapContentToHostDraft) : [];
  } catch {
    return isDemoModeEnabled() ? listSeedMedia(slug).map(mapContentToHostDraft) : [];
  }
}

export async function upsertHostVillageMediaDraft(
  draft: HostVillageMediaDraft,
  options: VillageMediaMutationOptions = {},
): Promise<HostVillageMediaDraft> {
  const insertValue = mapHostDraftToMediaInsert(draft);
  const now = new Date();
  const allowedVillageSlug = options.allowedVillageSlug
    ? createSlug(options.allowedVillageSlug)
    : undefined;

  assertMediaVillageAccess(insertValue.villageSlug, allowedVillageSlug);

  if (isUuid(draft.id)) {
    const [existingRow] = await getDb()
      .select({
        id: mediaTable.id,
        villageSlug: mediaTable.villageSlug,
      })
      .from(mediaTable)
      .where(eq(mediaTable.id, draft.id))
      .limit(1);

    if (existingRow) {
      assertMediaVillageAccess(existingRow.villageSlug, allowedVillageSlug);
    }

    const [updatedRow] = await getDb()
      .update(mediaTable)
      .set({ ...insertValue, updatedAt: now })
      .where(
        allowedVillageSlug
          ? and(
              eq(mediaTable.id, draft.id),
              eq(mediaTable.villageSlug, allowedVillageSlug),
            )
          : eq(mediaTable.id, draft.id),
      )
      .returning();

    if (updatedRow) return mapMediaRowToHostDraft(updatedRow);
  }

  if (!isUuid(draft.id) && draft.id) {
    const [existingRow] = await getDb()
      .select({
        id: mediaTable.id,
        villageSlug: mediaTable.villageSlug,
      })
      .from(mediaTable)
      .where(eq(mediaTable.legacyId, draft.id))
      .limit(1);

    if (existingRow) {
      assertMediaVillageAccess(existingRow.villageSlug, allowedVillageSlug);
    }

    const [updatedRow] = await getDb()
      .update(mediaTable)
      .set({ ...insertValue, updatedAt: now })
      .where(
        allowedVillageSlug
          ? and(
              eq(mediaTable.legacyId, draft.id),
              eq(mediaTable.villageSlug, allowedVillageSlug),
            )
          : eq(mediaTable.legacyId, draft.id),
      )
      .returning();

    if (updatedRow) return mapMediaRowToHostDraft(updatedRow);
  }

  const [row] = await getDb().insert(mediaTable).values(insertValue).returning();
  return mapMediaRowToHostDraft(row);
}

export async function deleteHostVillageMediaDraft(
  id: string,
  options: VillageMediaMutationOptions = {},
): Promise<boolean> {
  const normalizedId = id.trim();
  const allowedVillageSlug = options.allowedVillageSlug
    ? createSlug(options.allowedVillageSlug)
    : undefined;

  if (!normalizedId) return false;

  if (isUuid(normalizedId)) {
    const [existingRow] = await getDb()
      .select({
        id: mediaTable.id,
        villageSlug: mediaTable.villageSlug,
      })
      .from(mediaTable)
      .where(eq(mediaTable.id, normalizedId))
      .limit(1);

    if (!existingRow) return false;
    assertMediaVillageAccess(existingRow.villageSlug, allowedVillageSlug);

    const deletedRows = await getDb()
      .delete(mediaTable)
      .where(
        allowedVillageSlug
          ? and(
              eq(mediaTable.id, normalizedId),
              eq(mediaTable.villageSlug, allowedVillageSlug),
            )
          : eq(mediaTable.id, normalizedId),
      )
      .returning({ id: mediaTable.id });

    return deletedRows.length > 0;
  }

  const [existingRow] = await getDb()
    .select({
      id: mediaTable.id,
      villageSlug: mediaTable.villageSlug,
    })
    .from(mediaTable)
    .where(eq(mediaTable.legacyId, normalizedId))
    .limit(1);

  if (!existingRow) return false;
  assertMediaVillageAccess(existingRow.villageSlug, allowedVillageSlug);

  const deletedRows = await getDb()
    .delete(mediaTable)
    .where(
      allowedVillageSlug
        ? and(
            eq(mediaTable.legacyId, normalizedId),
            eq(mediaTable.villageSlug, allowedVillageSlug),
          )
        : eq(mediaTable.legacyId, normalizedId),
    )
    .returning({ id: mediaTable.id });

  return deletedRows.length > 0;
}

export function normalizeHostVillageMediaDraft(
  input: unknown,
): HostVillageMediaDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Media payload is required.");
  }

  const value = input as Record<string, unknown>;
  const sourceUrl =
    normalizeSourceUrl(asString(value.sourceUrl)) ||
    "https://nuvio.kr/boseong/media";
  const isChannelMagazine = sourceUrl.includes("/host/channels/magazines");
  const body = isChannelMagazine
    ? normalizeMagazineMediaBody(value.body)
    : normalizeBody(value.body);
  const imageUrls = normalizeImageUrls(value.imageUrls ?? value.images);
  const summary =
    asString(value.summary) ||
    (isChannelMagazine ? excerptFromHtml(body[0] ?? "", 140) : "") ||
    body[0] ||
    "전체차LAB의 활동을 기록한 미디어 콘텐츠입니다.";
  const now = new Date().toISOString();

  return {
    id: asString(value.id),
    villageSlug: createSlug(asString(value.villageSlug) || "boseong"),
    title: asString(value.title) || "전체차LAB 미디어",
    category: asMediaCategory(value.category),
    provider: asMediaProvider(value.provider),
    summary,
    body,
    thumbnail: normalizeImageUrlValue(
      asString(value.thumbnail) || asString(value.thumbnailUrl),
    ),
    images: imageUrls,
    imageUrls,
    embedUrl: normalizeEmbedUrl(value.embedUrl, value.sourceUrl),
    sourceName: asString(value.sourceName) || "전체차LAB",
    sourceUrl,
    createdAt: asString(value.createdAt) || now,
    date: normalizeDate(asString(value.date) || asString(value.publishedAt)),
    featured: Boolean(value.featured),
    published: value.published !== false,
    updatedAt: asString(value.updatedAt) || now,
  };
}

function mapHostDraftToMediaInsert(draft: HostVillageMediaDraft): MediaInsert {
  const publishedDate = normalizeDate(draft.date);

  return {
    legacyId: draft.id && !isUuid(draft.id) ? draft.id : null,
    villageSlug: createSlug(draft.villageSlug),
    title: draft.title.trim() || "전체차LAB 미디어",
    category: draft.category,
    provider: draft.provider,
    summary: draft.summary.trim(),
    body: draft.body.length > 0 ? draft.body : [draft.summary.trim()],
    thumbnailUrl: normalizeImageUrlValue(draft.thumbnail),
    imageUrls:
      draft.imageUrls.length > 0
        ? normalizeImageUrls(draft.imageUrls)
        : [normalizeImageUrlValue(draft.thumbnail)].filter(Boolean),
    embedUrl: draft.embedUrl?.trim() || null,
    sourceName: draft.sourceName.trim() || "전체차LAB",
    sourceUrl: normalizeSourceUrl(draft.sourceUrl) || "https://nuvio.kr/boseong/media",
    featured: draft.featured,
    publishedAt: draft.published ? new Date(publishedDate) : null,
  };
}

function mapMediaRowToContent(row: MediaRow): VillageMediaContent {
  const images = normalizeImageUrls(row.imageUrls).length > 0
    ? normalizeImageUrls(row.imageUrls)
    : [normalizeImageUrlValue(row.thumbnailUrl)].filter(Boolean);

  return {
    id: row.id,
    villageSlug: row.villageSlug,
    title: row.title,
    category: row.category,
    provider: asMediaProvider(row.provider),
    summary: row.summary,
    body: row.body,
    thumbnail: normalizeImageUrlValue(row.thumbnailUrl),
    images,
    embedUrl: row.embedUrl ?? undefined,
    sourceName: row.sourceName,
    sourceUrl: normalizeSourceUrl(row.sourceUrl) || "",
    createdAt: row.createdAt.toISOString(),
    date: (row.publishedAt ?? row.createdAt).toISOString(),
    featured: row.featured,
    published: Boolean(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMediaRowToHostDraft(row: MediaRow): HostVillageMediaDraft {
  const images = normalizeImageUrls(row.imageUrls).length > 0
    ? normalizeImageUrls(row.imageUrls)
    : [normalizeImageUrlValue(row.thumbnailUrl)].filter(Boolean);

  return {
    id: row.id,
    villageSlug: row.villageSlug,
    title: row.title,
    category: row.category,
    provider: asMediaProvider(row.provider),
    summary: row.summary,
    body: row.body,
    thumbnail: normalizeImageUrlValue(row.thumbnailUrl),
    images,
    imageUrls: images,
    embedUrl: row.embedUrl ?? undefined,
    sourceName: row.sourceName,
    sourceUrl: normalizeSourceUrl(row.sourceUrl) || "",
    createdAt: row.createdAt.toISOString(),
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
    provider: content.provider ?? "link",
    summary: content.summary,
    body: content.body,
    thumbnail: normalizeImageUrlValue(content.thumbnail),
    images: normalizeImageUrls(content.images).length > 0
      ? normalizeImageUrls(content.images)
      : [normalizeImageUrlValue(content.thumbnail)].filter(Boolean),
    imageUrls: normalizeImageUrls(content.images).length > 0
      ? normalizeImageUrls(content.images)
      : [normalizeImageUrlValue(content.thumbnail)].filter(Boolean),
    embedUrl: content.embedUrl,
    sourceName: content.sourceName,
    sourceUrl: normalizeSourceUrl(content.sourceUrl) || "",
    createdAt: content.createdAt ?? content.date,
    date: content.date.slice(0, 10),
    featured: Boolean(content.featured),
    published: content.published,
    updatedAt: content.updatedAt,
  };
}

function listSeedMedia(villageSlug: string): VillageMediaContent[] {
  return boseongMediaSeeds
    .filter((content) => content.villageSlug === villageSlug && content.published)
    .sort(compareMediaContentDesc);
}

function mergeMedia(
  databaseMedia: VillageMediaContent[],
  seedMedia: VillageMediaContent[],
): VillageMediaContent[] {
  return [...databaseMedia, ...seedMedia]
    .sort(compareMediaContentDesc)
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

function compareMediaContentDesc(
  a: VillageMediaContent,
  b: VillageMediaContent,
): number {
  const dateDifference = Date.parse(b.date) - Date.parse(a.date);
  if (dateDifference !== 0) return dateDifference;

  const createdAtDifference =
    Date.parse(b.createdAt ?? b.updatedAt) - Date.parse(a.createdAt ?? a.updatedAt);
  if (createdAtDifference !== 0) return createdAtDifference;

  return String(b.id).localeCompare(String(a.id));
}

function assertMediaVillageAccess(
  villageSlug: string,
  allowedVillageSlug: string | undefined,
) {
  if (!allowedVillageSlug) return;
  if (createSlug(villageSlug) !== allowedVillageSlug) {
    throw new VillageMediaAccessError();
  }
}

function asMediaCategory(value: unknown): VillageMediaCategory {
  const text = asString(value);
  return mediaCategories.includes(text as VillageMediaCategory)
    ? (text as VillageMediaCategory)
    : "original";
}

function asMediaProvider(value: unknown): VillageMediaProvider {
  const text = asString(value);
  return mediaProviders.includes(text as VillageMediaProvider)
    ? (text as VillageMediaProvider)
    : "link";
}

function normalizeEmbedUrl(embedValue: unknown, sourceValue: unknown): string | undefined {
  const directEmbed = normalizeYoutubeEmbedUrl(asString(embedValue));
  if (directEmbed) return directEmbed;

  const instagramEmbed = normalizeInstagramEmbedUrl(asString(embedValue));
  if (instagramEmbed) return instagramEmbed;

  return (
    normalizeYoutubeEmbedUrl(asString(sourceValue)) ||
    normalizeInstagramEmbedUrl(asString(sourceValue)) ||
    undefined
  );
}

function normalizeYoutubeEmbedUrl(value: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : undefined;
    }

    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : undefined;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : undefined;
      }

      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function normalizeInstagramEmbedUrl(value: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("instagram.com")) return undefined;

    const parts = url.pathname.split("/").filter(Boolean);
    const type = parts[0];
    const id = parts[1];
    if (!id || (type !== "reel" && type !== "p" && type !== "tv")) {
      return undefined;
    }

    return `https://www.instagram.com/${type}/${id}/embed`;
  } catch {
    return undefined;
  }
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

function normalizeMagazineMediaBody(value: unknown): string[] {
  const [rawHtml = ""] = normalizeBody(value);
  const contentHtml = sanitizeMagazineHtml(rawHtml);

  if (!hasMagazineContent(contentHtml)) {
    throw new Error("Magazine content is required.");
  }

  return [contentHtml];
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) =>
          typeof item === "string" ? normalizeImageUrlValue(item) : "",
        )
        .filter(Boolean),
    ),
  );
}

function normalizeImageUrlValue(value: string): string {
  return trySanitizePublicImageUrl(value, { allowRelative: true });
}

function normalizeSourceUrl(value: string): string {
  return trySanitizeHttpUrl(value, { allowRelative: true });
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
