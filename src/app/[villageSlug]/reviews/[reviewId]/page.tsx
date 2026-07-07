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
import { getPublicReviewFromDb } from "@/lib/review-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  reviewJsonLd,
} from "@/lib/seo";
import type { Program, Review } from "@/lib/types";
import type { Village } from "@/lib/village-types";
import {
  isReservedVillageSlug,
  supportsVillageReviewDetailPages,
} from "@/lib/village-routing";

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
  if (!supportsVillageReviewDetailPages(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  const programs = await getVillagePrograms(village);
  const review = await resolveVillageReview(village, programs, reviewId);
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
  if (!supportsVillageReviewDetailPages(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const review = await resolveVillageReview(village, programs, reviewId);
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

async function resolveVillageReview(
  village: Village,
  programs: Program[],
  reviewId: string,
): Promise<Review | undefined> {
  const review = await getPublicReviewFromDb(reviewId);
  if (review && reviewBelongsToVillage(review, village.slug, programs)) {
    return review;
  }

  const fallbackReviews = await getVillageReviews(village, programs, { limit: 300 });
  return fallbackReviews.find((item) => String(item.id) === reviewId);
}

function reviewBelongsToVillage(
  review: Review,
  villageSlug: string,
  programs: Program[],
): boolean {
  if (review.villageSlug === villageSlug) return true;

  return programs.some((program) => {
    if (review.programId !== undefined && String(program.id) === String(review.programId)) {
      return true;
    }
    return Boolean(review.programSlug && program.slug === review.programSlug);
  });
}
