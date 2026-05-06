import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageReviewDetailPage } from "@/components/village-index-pages";
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
  params: Promise<{ villageSlug: string; reviewId: string }>;
}): Promise<Metadata> {
  const { villageSlug, reviewId } = await params;
  if (isReservedVillageSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs);
  const review = reviews.find(
    (item) => String(item.id) === reviewId,
  );
  if (!review) return {};

  return {
    title: `${review.title} | ${village.name}`,
    description: review.excerpt,
  };
}

export default async function VillageReviewDetailRoute({
  params,
}: {
  params: Promise<{ villageSlug: string; reviewId: string }>;
}) {
  const { villageSlug, reviewId } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs);
  const review = reviews.find(
    (item) => String(item.id) === reviewId,
  );
  if (!review) notFound();

  return (
    <VillageReviewDetailPage
      programs={programs}
      review={review}
      village={village}
    />
  );
}
