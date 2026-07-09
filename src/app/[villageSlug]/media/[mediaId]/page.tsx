import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/json-ld";
import { VillageMediaDetailPage } from "@/components/village-media-pages";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  mediaArticleJsonLd,
} from "@/lib/seo";
import { isReservedChannelSlug } from "@/lib/channel-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mediaId: string; villageSlug: string }>;
}): Promise<Metadata> {
  const { mediaId, villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  const media = await listPublicVillageMedia(village.slug);
  const content = media.find((item) => String(item.id) === mediaId);
  if (!content) return {};

  return createSeoMetadata({
    title: `${content.title} | ${village.name}`,
    description: content.summary,
    image: content.thumbnail,
    path: `/${village.slug}/media/${content.id}`,
  });
}

export default async function VillageMediaDetailRoute({
  params,
}: {
  params: Promise<{ mediaId: string; villageSlug: string }>;
}) {
  const { mediaId, villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const media = await listPublicVillageMedia(village.slug);
  const content = media.find((item) => String(item.id) === mediaId);

  if (!content) notFound();
  const canonicalPath = `/${village.slug}/media/${content.id}`;

  return (
    <>
      <JsonLdScript
        data={[
          mediaArticleJsonLd(content, canonicalPath, village.name),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: village.name, path: `/${village.slug}` },
            { name: "미디어", path: `/${village.slug}/media` },
            { name: content.title, path: canonicalPath },
          ]),
        ]}
      />
      <VillageMediaDetailPage
        content={content}
        media={media}
        programs={programs}
        village={village}
      />
    </>
  );
}
