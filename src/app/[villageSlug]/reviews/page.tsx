import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageReviewsIndexPage } from "@/components/village-index-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
} from "@/lib/village-db";
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
    title: `참여 후기 | ${village.name}`,
    description: `${village.name} 참여 후기와 운영 기록입니다.`,
  };
}

export default async function VillageReviewsRoute({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs);

  return (
    <VillageReviewsIndexPage
      programs={programs}
      reviews={reviews}
      village={village}
    />
  );
}
