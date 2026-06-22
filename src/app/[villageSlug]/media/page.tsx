import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageMediaIndexPage } from "@/components/village-media-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
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
    title: `미디어 | ${village.name}`,
    description: `${village.name}의 자체 컨텐츠, 방송출연, 활동 아카이브입니다.`,
    image: village.heroImage,
    path: `/${village.slug}/media`,
  });
}

export default async function VillageMediaRoute({
  params,
  searchParams,
}: {
  params: Promise<{ villageSlug: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
}) {
  const { villageSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const rawViewType = Array.isArray(query.type) ? query.type[0] : query.type;
  const viewType = rawViewType === "magazine" ? "magazine" : "gallery";
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const media = await listPublicVillageMedia(village.slug);
  const pageSections =
    village.slug === "boseong"
      ? await listPublicVillagePageSections(village.slug, "media")
      : undefined;

  return (
    <VillageMediaIndexPage
      media={media}
      pageSections={pageSections}
      programs={programs}
      village={village}
      viewType={viewType}
    />
  );
}
