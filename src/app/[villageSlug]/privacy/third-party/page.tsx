import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageLegalPage } from "@/components/village-legal-page";
import { legalDocuments } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo";
import { getPublicVillageBySlug } from "@/lib/village-db";
import { isReservedChannelSlug } from "@/lib/channel-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    title: `${legalDocuments.thirdParty.title} | ${village.name}`,
    description: legalDocuments.thirdParty.description,
    noIndex: true,
    path: `/${village.slug}/privacy/third-party`,
  });
}

export default async function VillageThirdPartyPrivacyPage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  return <VillageLegalPage document={legalDocuments.thirdParty} village={village} />;
}
