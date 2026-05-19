import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homepageHeroSlides as homepageHeroSlidesTable } from "@/db/schema";

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

export const defaultHomeHeroSlides: HomeHeroSlide[] = [
  {
    id: "demo-namhae-workation",
    eyebrow: "추천 프로그램",
    title: "남해 바다 워케이션 7일",
    subtitle:
      "남해 바다 앞 공유 작업공간에서 7일간 일하고 쉬며 로컬 클래스를 경험하는 워케이션 프로그램입니다.",
    imageUrl: fallbackImageUrl,
    href: "/programs/namhae-blue-workation-2026",
    sortOrder: 0,
    published: true,
  },
  {
    id: "demo-daon-local-lab",
    eyebrow: "로컬 채널",
    title: "다온 로컬랩",
    subtitle:
      "빈집과 공유 작업공간, 지역 클래스를 연결해 남해 체류 경험을 운영하는 첫 번째 누비오 채널입니다.",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82",
    href: "/daon-local-lab",
    sortOrder: 1,
    published: true,
  },
  {
    id: "demo-local-stays",
    eyebrow: "새로운 체류",
    title: "로컬 체류 프로그램 모아보기",
    subtitle:
      "일주일 워케이션부터 지역 클래스까지, 지금 신청 가능한 누비오 프로그램을 한 번에 확인해보세요.",
    imageUrl:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1600&q=82",
    href: "/",
    sortOrder: 2,
    published: true,
  },
  {
    id: "demo-host-center",
    eyebrow: "운영자 공간",
    title: "호스트센터에서 프로그램을 운영하세요",
    subtitle:
      "마을 채널, 프로그램 등록, 신청자 관리까지 운영 흐름을 한 화면에서 이어갈 수 있습니다.",
    imageUrl:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=82",
    href: "/host",
    sortOrder: 3,
    published: true,
  },
];

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

    if (rows.length === 0) return defaultHomeHeroSlides;
    return rows.map(mapHomeHeroSlideRow);
  } catch {
    return defaultHomeHeroSlides;
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
