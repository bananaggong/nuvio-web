import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/json-ld";
import { VillageReviewDetailPage } from "@/components/village-index-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
} from "@/lib/village-db";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  reviewJsonLd,
} from "@/lib/seo";
import { isReservedVillageSlug } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ villageSlug: string; reviewId: string }>;
}): Promise<Metadata> {
  if (!launchFeatureFlags.reviews) return {};

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

  return createSeoMetadata({
    title: `${review.title} | ${village.name}`,
    description: review.excerpt,
    image: review.images[0] || village.heroImage,
    path: `/${village.slug}/reviews/${review.id}`,
  });
}

export default async function VillageReviewDetailRoute({
  params,
}: {
  params: Promise<{ villageSlug: string; reviewId: string }>;
}) {
  if (!launchFeatureFlags.reviews) notFound();

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
  const canonicalPath = `/${village.slug}/reviews/${review.id}`;

  return (
    <>
      <JsonLdScript
        data={[
          reviewJsonLd(review, canonicalPath, village.name),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: village.name, path: `/${village.slug}` },
            { name: "후기", path: `/${village.slug}/reviews` },
            { name: review.title, path: canonicalPath },
          ]),
        ]}
      />
      <VillageReviewDetailPage
        programs={programs}
        review={review}
        village={village}
      />
    </>
  );
}
