export type VillagePageKey = "home" | "about";
export type VillagePageSectionStatus = "draft" | "published" | "archived";
export type VillagePageSectionType =
  | "hero"
  | "image_story"
  | "original_carousel"
  | "media_preview"
  | "reviews_preview"
  | "about_grid"
  | "footer";

export type VillagePageSectionDraft = {
  id: string;
  villageSlug: string;
  pageKey: VillagePageKey;
  sectionKey: string;
  sectionType: VillagePageSectionType;
  label: string;
  draftContent: Record<string, unknown>;
  publishedContent?: Record<string, unknown>;
  orderIndex: number;
  publishedOrderIndex?: number;
  visible: boolean;
  publishedVisible?: boolean;
  status: VillagePageSectionStatus;
  publishedAt?: string;
  updatedAt: string;
};

export type PublishedVillagePageSection = {
  id: string;
  villageSlug: string;
  pageKey: VillagePageKey;
  sectionKey: string;
  sectionType: VillagePageSectionType;
  label: string;
  content: Record<string, unknown>;
  orderIndex: number;
  visible: boolean;
  publishedAt?: string;
};

export function getSectionContent<T extends Record<string, unknown>>(
  sections: PublishedVillagePageSection[] | undefined,
  sectionKey: string,
  fallback: T,
): T {
  const section = sections?.find((item) => item.sectionKey === sectionKey);
  return section?.content ? ({ ...fallback, ...section.content } as T) : fallback;
}
