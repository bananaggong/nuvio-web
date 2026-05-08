import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageHomePage } from "@/components/village-home-page";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
  listPublicVillages,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { listPublicVillagePageSections } from "@/lib/village-page-cms";
import { isReservedVillageSlug } from "@/lib/village-routing";

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
  if (isReservedVillageSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  return {
    title: `${village.name} | NUVIO`,
    description: village.summary,
    openGraph: {
      title: village.name,
      description: village.summary,
      images: [{ url: village.heroImage }],
    },
  };
}

export default async function ShortVillagePage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);

  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs, { limit: 8 });
  const media = await listPublicVillageMedia(village.slug, { limit: 6 });
  const pageSections =
    village.slug === "boseong"
      ? await listPublicVillagePageSections(village.slug, "home")
      : undefined;

  return (
    <VillageHomePage
      media={media}
      pageSections={pageSections}
      programs={programs}
      reviews={reviews}
      village={village}
    />
  );
}
