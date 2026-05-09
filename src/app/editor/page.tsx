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
  title: "보성 공개 페이지 편집 | NUVIO",
  description: "보성 로컬홈 공개 홈페이지를 실제 화면 위에서 편집합니다.",
};

export default async function EditorPage() {
  const village = await getPublicVillageBySlug("boseong");

  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const [reviews, media, sections, assets] = await Promise.all([
    getVillageReviews(village, programs, { limit: 8 }),
    listPublicVillageMedia(village.slug, { limit: 6 }),
    listHostVillagePageSections(village.slug, "home"),
    safeListVillageAssets(village.slug),
  ]);

  return (
    <BoseongPageEditor
      assets={assets}
      media={media}
      programs={programs}
      reviews={reviews}
      sections={sections}
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
