import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { magazinePosts, profiles } from "@/db/schema";
import {
  normalizeMagazineSlug,
  sanitizeMagazineHtml,
} from "@/lib/magazine-content";
import type { MagazinePostStatus } from "@/lib/magazine-types";
import { trySanitizePublicImageUrl } from "@/lib/url-security";

type MagazinePostRow = typeof magazinePosts.$inferSelect;
type MagazinePostValues = {
  archivedAt: Date | null;
  category: string;
  contentHtml: string;
  contentJson: Record<string, unknown>;
  coverImageAlt: string | null;
  coverImageUrl: string | null;
  excerpt: string | null;
  publishedAt: Date | null;
  status: MagazinePostStatus;
  subtitle: string | null;
  title: string;
  updatedAt: Date;
};

export type MagazinePost = {
  archivedAt: string | null;
  authorEmail: string;
  authorId: string;
  authorName: string;
  category: string;
  contentHtml: string;
  contentJson: Record<string, unknown>;
  coverImageAlt: string;
  coverImageUrl: string;
  createdAt: string;
  excerpt: string;
  id: string;
  publishedAt: string | null;
  slug: string;
  status: MagazinePostStatus;
  subtitle: string;
  title: string;
  updatedAt: string;
};

export type MagazinePostInput = {
  category: string;
  contentHtml: string;
  contentJson: Record<string, unknown>;
  coverImageAlt: string;
  coverImageUrl: string;
  excerpt: string;
  slug: string;
  status: MagazinePostStatus;
  subtitle: string;
  title: string;
};

export async function listPublicMagazinePosts(limit = 24): Promise<MagazinePost[]> {
  const rows = await baseMagazinePostQuery()
    .where(
      and(
        eq(magazinePosts.status, "published"),
        isNull(magazinePosts.archivedAt),
      ),
    )
    .orderBy(desc(magazinePosts.publishedAt), desc(magazinePosts.createdAt))
    .limit(clampLimit(limit));

  return rows.map(mapMagazinePostResult);
}

export async function getPublicMagazinePostBySlug(
  slug: string,
): Promise<MagazinePost | undefined> {
  const rows = await baseMagazinePostQuery()
    .where(
      and(
        eq(magazinePosts.slug, slug),
        eq(magazinePosts.status, "published"),
        isNull(magazinePosts.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ? mapMagazinePostResult(rows[0]) : undefined;
}

export async function listAdminMagazinePosts(
  limit = 100,
): Promise<MagazinePost[]> {
  const rows = await baseMagazinePostQuery()
    .orderBy(desc(magazinePosts.updatedAt))
    .limit(clampLimit(limit, 200));

  return rows.map(mapMagazinePostResult);
}

export async function getAdminMagazinePost(
  id: string,
): Promise<MagazinePost | undefined> {
  const rows = await baseMagazinePostQuery()
    .where(eq(magazinePosts.id, id))
    .limit(1);

  return rows[0] ? mapMagazinePostResult(rows[0]) : undefined;
}

export async function createMagazinePost(
  input: MagazinePostInput,
  authorId: string,
): Promise<MagazinePost> {
  const now = new Date();
  const slug = await ensureUniqueMagazineSlug(input.slug || input.title);
  const [row] = await getDb()
    .insert(magazinePosts)
    .values({
      ...mapInputToDbValues(input, now),
      authorId,
      slug,
    })
    .returning();

  return (await getAdminMagazinePost(row.id)) ?? mapMagazinePostRow(row);
}

export async function updateMagazinePost(
  id: string,
  input: MagazinePostInput,
): Promise<MagazinePost | undefined> {
  const existing = await getAdminMagazinePost(id);
  if (!existing) return undefined;

  const now = new Date();
  const slug = await ensureUniqueMagazineSlug(
    input.slug || input.title,
    existing.id,
  );
  const [row] = await getDb()
    .update(magazinePosts)
    .set({
      ...mapInputToDbValues(input, now, existing),
      slug,
    })
    .where(eq(magazinePosts.id, id))
    .returning();

  return row ? (await getAdminMagazinePost(row.id)) ?? mapMagazinePostRow(row) : undefined;
}

export async function archiveMagazinePost(
  id: string,
): Promise<MagazinePost | undefined> {
  const [row] = await getDb()
    .update(magazinePosts)
    .set({
      archivedAt: new Date(),
      status: "archived",
      updatedAt: new Date(),
    })
    .where(eq(magazinePosts.id, id))
    .returning();

  return row ? (await getAdminMagazinePost(row.id)) ?? mapMagazinePostRow(row) : undefined;
}

async function ensureUniqueMagazineSlug(
  value: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = normalizeMagazineSlug(value);

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const predicates = [eq(magazinePosts.slug, slug)];
    if (excludeId) predicates.push(ne(magazinePosts.id, excludeId));

    const existing = await getDb()
      .select({ id: magazinePosts.id })
      .from(magazinePosts)
      .where(and(...predicates))
      .limit(1);

    if (existing.length === 0) return slug;
  }

  return `${baseSlug}-${Date.now()}`;
}

function baseMagazinePostQuery() {
  return getDb()
    .select({
      post: magazinePosts,
      authorEmail: profiles.email,
      authorName: profiles.displayName,
    })
    .from(magazinePosts)
    .leftJoin(profiles, eq(magazinePosts.authorId, profiles.id))
    .$dynamic();
}

function mapInputToDbValues(
  input: MagazinePostInput,
  now: Date,
  existing?: MagazinePost,
): MagazinePostValues {
  const publishedAt =
    input.status === "published"
      ? existing?.publishedAt
        ? new Date(existing.publishedAt)
        : now
      : null;

  return {
    archivedAt: input.status === "archived" ? now : null,
    category: input.category,
    contentHtml: input.contentHtml,
    contentJson: input.contentJson,
    coverImageAlt: input.coverImageAlt || null,
    coverImageUrl: input.coverImageUrl || null,
    excerpt: input.excerpt || null,
    publishedAt,
    status: input.status,
    subtitle: input.subtitle || null,
    title: input.title,
    updatedAt: now,
  };
}

function mapMagazinePostResult(row: {
  authorEmail: string | null;
  authorName: string | null;
  post: MagazinePostRow;
}): MagazinePost {
  return mapMagazinePostRow(row.post, {
    authorEmail: row.authorEmail ?? "",
    authorName: row.authorName ?? "",
  });
}

function mapMagazinePostRow(
  row: MagazinePostRow,
  author: { authorEmail?: string; authorName?: string } = {},
): MagazinePost {
  return {
    archivedAt: row.archivedAt?.toISOString() ?? null,
    authorEmail: author.authorEmail ?? "",
    authorId: row.authorId ?? "",
    authorName: author.authorName ?? "",
    category: row.category,
    contentHtml: sanitizeMagazineHtml(row.contentHtml),
    contentJson: row.contentJson,
    coverImageAlt: row.coverImageAlt ?? "",
    coverImageUrl: trySanitizePublicImageUrl(row.coverImageUrl ?? "", {
      allowRelative: true,
    }),
    createdAt: row.createdAt.toISOString(),
    excerpt: row.excerpt ?? "",
    id: row.id,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    slug: row.slug,
    status: row.status,
    subtitle: row.subtitle ?? "",
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function clampLimit(limit: number, max = 100): number {
  if (!Number.isFinite(limit)) return Math.min(24, max);
  return Math.min(Math.max(Math.trunc(limit), 1), max);
}
