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
