import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageReviewsIndexPage } from "@/components/village-index-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
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
    title: `참여 후기 | ${village.name}`,
    description: `${village.name} 참여 후기와 운영 기록입니다.`,
    image: village.heroImage,
    path: `/${village.slug}/reviews`,
  });
}

export default async function VillageReviewsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ villageSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { villageSlug } = await params;
  const query = (await searchParams) ?? {};
  const programFilter = Array.isArray(query.program) ? query.program[0] : query.program;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs);
  const pageSections =
    village.slug === "boseong"
      ? await listPublicVillagePageSections(village.slug, "reviews")
      : undefined;

  return (
    <VillageReviewsIndexPage
      pageSections={pageSections}
      programs={programs}
      reviewFilter={programFilter}
      reviews={reviews}
      village={village}
    />
  );
}
