import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homepageHeroSlides as homepageHeroSlidesTable } from "@/db/schema";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  sortOrder: number;
  published: boolean;
  updatedAt?: string;
};

type HomeHeroSlideRow = typeof homepageHeroSlidesTable.$inferSelect;

const fallbackImageUrl =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82";

export const defaultHomeHeroSlides: HomeHeroSlide[] = [];

export async function listPublishedHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  try {
    const rows = await getDb()
      .select()
      .from(homepageHeroSlidesTable)
      .where(eq(homepageHeroSlidesTable.published, true))
      .orderBy(asc(homepageHeroSlidesTable.sortOrder));

    return rows.map(mapHomeHeroSlideRow);
  } catch {
    return [];
  }
}

export async function listAdminHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  try {
    const rows = await getDb()
      .select()
      .from(homepageHeroSlidesTable)
      .orderBy(asc(homepageHeroSlidesTable.sortOrder));

    if (rows.length === 0) return isDemoModeEnabled() ? defaultHomeHeroSlides : [];
    return rows.map(mapHomeHeroSlideRow);
  } catch {
    return isDemoModeEnabled() ? defaultHomeHeroSlides : [];
  }
}

export async function replaceHomeHeroSlides(
  input: unknown,
): Promise<HomeHeroSlide[]> {
  const slides = normalizeHomeHeroSlides(input);
  const db = getDb();
  const now = new Date();
  const activeIds = new Set(slides.map((slide) => slide.id));

  for (const slide of slides) {
    await db
      .insert(homepageHeroSlidesTable)
      .values({
        id: slide.id,
        eyebrow: slide.eyebrow,
        title: slide.title,
        subtitle: slide.subtitle,
        imageUrl: slide.imageUrl,
        href: slide.href,
        sortOrder: slide.sortOrder,
        published: slide.published,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: homepageHeroSlidesTable.id,
        set: {
          eyebrow: slide.eyebrow,
          title: slide.title,
          subtitle: slide.subtitle,
          imageUrl: slide.imageUrl,
          href: slide.href,
          sortOrder: slide.sortOrder,
          published: slide.published,
          updatedAt: now,
        },
      });
  }

  const existingRows = await db
    .select({ id: homepageHeroSlidesTable.id })
    .from(homepageHeroSlidesTable);

  for (const row of existingRows) {
    if (activeIds.has(row.id)) continue;

    await db
      .update(homepageHeroSlidesTable)
      .set({ published: false, updatedAt: now })
      .where(eq(homepageHeroSlidesTable.id, row.id));
  }

  return listAdminHomeHeroSlides();
}

export function normalizeHomeHeroSlides(input: unknown): HomeHeroSlide[] {
  if (!Array.isArray(input)) {
    throw new Error("Hero slides must be an array.");
  }

  return input.map((item, index) => {
    const value =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    const title = cleanText(value.title, `홈 배너 ${index + 1}`, 90);
    const href = normalizeHref(value.href);

    return {
      id: normalizeId(value.id, title, href, index),
      eyebrow: cleanText(value.eyebrow, "", 32),
      title,
      subtitle: cleanText(value.subtitle, "누비오의 추천 프로그램을 확인해보세요.", 220),
      imageUrl: normalizeImageUrl(value.imageUrl),
      href,
      sortOrder: index,
      published: value.published !== false,
    };
  });
}

function mapHomeHeroSlideRow(row: HomeHeroSlideRow): HomeHeroSlide {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.imageUrl,
    href: row.href,
    sortOrder: row.sortOrder,
    published: row.published,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  const normalized = text || fallback;
  return normalized.slice(0, maxLength);
}

function normalizeHref(value: unknown): string {
  const href = typeof value === "string" ? value.trim() : "";
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) {
    return href.slice(0, 400);
  }

  return "/";
}

function normalizeImageUrl(value: unknown): string {
  const imageUrl = typeof value === "string" ? value.trim() : "";
  if (
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("http://")
  ) {
    return imageUrl.slice(0, 700);
  }

  return fallbackImageUrl;
}

function normalizeId(
  value: unknown,
  title: string,
  href: string,
  index: number,
): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (/^[a-z0-9][a-z0-9_-]{1,78}$/i.test(id)) return id;

  const slug = `${title}-${href}`
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug ? `hero-${slug}` : `hero-${index + 1}`;
}
