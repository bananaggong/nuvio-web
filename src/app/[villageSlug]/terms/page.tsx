import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageLegalPage } from "@/components/village-legal-page";
import { legalDocuments } from "@/lib/legal-documents";
import { getPublicVillageBySlug } from "@/lib/village-db";
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

  return {
    title: `${legalDocuments.terms.title} | ${village.name}`,
    description: legalDocuments.terms.description,
  };
}

export default async function VillageTermsPage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  return <VillageLegalPage document={legalDocuments.terms} village={village} />;
}
