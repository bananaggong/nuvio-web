import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoseongFigmaMediaAspectIndexPage } from "@/components/boseong-figma-site";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { createSeoMetadata } from "@/lib/seo";
import { isReservedVillageSlug } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}): Promise<Metadata> {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug) || villageSlug !== "boseong") return {};

  return createSeoMetadata({
    title: "미디어 16:9 카드 실험 | 전체차LAB",
    description: "전체차LAB 미디어 카드의 16:9 썸네일 비율 대안 화면입니다.",
    noIndex: true,
    path: "/boseong/media2",
  });
}

export default async function VillageMediaAspectRoute({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug) || villageSlug !== "boseong") notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const media = await listPublicVillageMedia(village.slug);

  return (
    <BoseongFigmaMediaAspectIndexPage
      media={media}
      programs={programs}
      village={village}
    />
  );
}
