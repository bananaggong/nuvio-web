import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoseongPageEditor } from "@/components/boseong-page-editor";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
} from "@/lib/village-db";
import { listVillageAssets } from "@/lib/village-assets-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { listHostVillagePageSections } from "@/lib/village-page-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "보성 공개 페이지 편집 | 누비오",
  description: "보성 로컬홈 공개 홈페이지를 실제 화면 위에서 편집합니다.",
};

export default async function HostBoseongEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const village = await getPublicVillageBySlug("boseong");

  if (!village) notFound();

  const { page } = await searchParams;
  const initialPageKey = normalizeEditorPageKey(page);
  const programs = await getVillagePrograms(village);
  const [
    reviews,
    media,
    homeSections,
    aboutSections,
    mediaSections,
    programsSections,
    reviewsSections,
    noticeSections,
    assets,
  ] = await Promise.all([
      getVillageReviews(village, programs),
      listPublicVillageMedia(village.slug, { limit: 12 }),
      listHostVillagePageSections(village.slug, "home"),
      listHostVillagePageSections(village.slug, "about"),
      listHostVillagePageSections(village.slug, "media"),
      listHostVillagePageSections(village.slug, "programs"),
      listHostVillagePageSections(village.slug, "reviews"),
      listHostVillagePageSections(village.slug, "notice"),
      safeListVillageAssets(village.slug),
    ]);

  return (
    <BoseongPageEditor
      assets={assets}
      initialPageKey={initialPageKey}
      media={media}
      programs={programs}
      reviews={reviews}
      sectionsByPage={{
        about: aboutSections,
        home: homeSections,
        media: mediaSections,
        notice: noticeSections,
        programs: programsSections,
        reviews: reviewsSections,
      }}
      village={village}
    />
  );
}

async function safeListVillageAssets(villageSlug: string) {
  try {
    return await listVillageAssets(villageSlug);
  } catch {
    return [];
  }
}

function normalizeEditorPageKey(value?: string) {
  if (
    value === "about" ||
    value === "media" ||
    value === "programs" ||
    value === "reviews" ||
    value === "notice"
  ) {
    return value;
  }
  return "home";
}
