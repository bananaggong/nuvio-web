import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageHomePage } from "@/components/village-home-page";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
  listPublicVillages,
} from "@/lib/village-db";

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

export default async function VillagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await getPublicVillageBySlug(slug);

  if (!village) notFound();

  const programs = await getVillagePrograms(village);
  const reviews = await getVillageReviews(village, programs, { limit: 6 });

  return <VillageHomePage programs={programs} reviews={reviews} village={village} />;
}
