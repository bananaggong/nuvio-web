import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/json-ld";
import { VillageHomePage } from "@/components/village-home-page";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
  listPublicVillages,
} from "@/lib/village-db";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  villageJsonLd,
} from "@/lib/seo";
import { canonicalVillagePath } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateStaticParams() {
  const villages = await listPublicVillages();
  return villages.map((village) => ({ slug: village.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await getPublicVillageBySlug(slug);
  if (!village) return {};

  return createSeoMetadata({
    title: village.name,
    description: village.summary,
    image: village.heroImage,
    keywords: [village.region, village.city, village.name, "채널"],
    path: canonicalVillagePath(village.slug),
  });
}

export default async function VillagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await getPublicVillageBySlug(slug);

  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = launchFeatureFlags.reviews
    ? await getVillageReviews(village, programs, { limit: 6 })
    : [];
  const media = await listPublicVillageMedia(village.slug, { limit: 6 });

  return (
    <>
      <JsonLdScript
        data={[
          villageJsonLd(village, canonicalVillagePath(village.slug)),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "채널", path: "/channels" },
            { name: village.name, path: canonicalVillagePath(village.slug) },
          ]),
        ]}
      />
      <VillageHomePage
        media={media}
        programs={programs}
        reviews={reviews}
        village={village}
      />
    </>
  );
}
