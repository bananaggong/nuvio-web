import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageMediaDetailPage } from "@/components/village-media-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { isReservedVillageSlug } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mediaId: string; villageSlug: string }>;
}): Promise<Metadata> {
  const { mediaId, villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  const media = await listPublicVillageMedia(village.slug);
  const content = media.find((item) => String(item.id) === mediaId);
  if (!content) return {};

  return {
    title: `${content.title} | ${village.name}`,
    description: content.summary,
    openGraph: {
      title: content.title,
      description: content.summary,
      images: [{ url: content.thumbnail }],
    },
  };
}

export default async function VillageMediaDetailRoute({
  params,
}: {
  params: Promise<{ mediaId: string; villageSlug: string }>;
}) {
  const { mediaId, villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const media = await listPublicVillageMedia(village.slug);
  const content = media.find((item) => String(item.id) === mediaId);

  if (!content) notFound();

  return (
    <VillageMediaDetailPage
      content={content}
      media={media}
      programs={programs}
      village={village}
    />
  );
}
