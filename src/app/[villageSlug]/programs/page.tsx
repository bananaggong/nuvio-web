import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageProgramsIndexPage } from "@/components/village-index-pages";
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
    title: `프로그램 | ${village.name}`,
    description: `${village.name}에서 운영하는 프로그램 목록입니다.`,
  };
}

export default async function VillageProgramsRoute({
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
      ? await listPublicVillagePageSections(village.slug, "programs")
      : undefined;

  return (
    <VillageProgramsIndexPage
      pageSections={pageSections}
      programs={programs}
      village={village}
    />
  );
}
