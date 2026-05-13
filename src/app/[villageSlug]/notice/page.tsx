import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageNoticeIndexPage } from "@/components/village-index-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillagePageSections } from "@/lib/village-page-cms";
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
  if (isReservedVillageSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  return createSeoMetadata({
    title: `알림마당 | ${village.name}`,
    description: `${village.name} 신청, 선정, 운영 안내입니다.`,
    image: village.heroImage,
    path: `/${village.slug}/notice`,
  });
}

export default async function VillageNoticeRoute({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const pageSections =
    village.slug === "boseong"
      ? await listPublicVillagePageSections(village.slug, "notice")
      : undefined;

  return (
    <VillageNoticeIndexPage
      pageSections={pageSections}
      programs={programs}
      village={village}
    />
  );
}
