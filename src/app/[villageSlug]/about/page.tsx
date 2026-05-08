import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageAboutIndexPage } from "@/components/village-index-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillagePageSections } from "@/lib/village-page-cms";
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

  return {
    title: `둘러보기 | ${village.name}`,
    description: village.description,
  };
}

export default async function VillageAboutRoute({
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
      ? await listPublicVillagePageSections(village.slug, "about")
      : undefined;

  return (
    <VillageAboutIndexPage
      pageSections={pageSections}
      programs={programs}
      village={village}
    />
  );
}
