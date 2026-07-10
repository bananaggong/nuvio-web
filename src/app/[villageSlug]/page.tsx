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
import { listPublicChannelBoardPosts } from "@/lib/channel-board-posts";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { listPublicVillagePageSections } from "@/lib/village-page-cms";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  villageJsonLd,
} from "@/lib/seo";
import { canonicalChannelPath, isReservedChannelSlug } from "@/lib/channel-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateStaticParams() {
  const villages = await listPublicVillages();
  return villages.map((village) => ({ villageSlug: village.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}): Promise<Metadata> {
  const { villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  return createSeoMetadata({
    title: village.name,
    description: village.summary,
    image: village.heroImage,
    keywords: [village.region, village.city, village.name, "채널"],
    path: canonicalChannelPath(village.slug),
  });
}

export default async function ShortVillagePage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);

  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const [boardPosts, media, pageSections, reviews] = await Promise.all([
    village.slug === "boseong" ? [] : listPublicChannelBoardPosts(village.slug),
    listPublicVillageMedia(village.slug, { limit: 6 }),
    village.slug === "boseong"
      ? listPublicVillagePageSections(village.slug, "home")
      : undefined,
    launchFeatureFlags.reviews
      ? getVillageReviews(village, programs, { limit: 8 })
      : [],
  ]);

  return (
    <>
      <JsonLdScript
        data={[
          villageJsonLd(village, canonicalChannelPath(village.slug)),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "채널", path: "/channels" },
            { name: village.name, path: canonicalChannelPath(village.slug) },
          ]),
        ]}
      />
      <VillageHomePage
        boardPosts={boardPosts}
        media={media}
        pageSections={pageSections}
        programs={programs}
        reviews={reviews}
        village={village}
      />
    </>
  );
}
