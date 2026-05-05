import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageProgramPage } from "@/components/village-program-page";
import {
  getPublicVillageBySlug,
  resolveVillageProgram,
} from "@/lib/village-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; programSlug: string }>;
}): Promise<Metadata> {
  const { slug, programSlug } = await params;
  const village = await getPublicVillageBySlug(slug);
  if (!village) return {};

  const program = await resolveVillageProgram(village, programSlug);
  if (!program) return {};

  return {
    title: `${program.title} | ${village.name}`,
    description: program.summary,
    openGraph: {
      title: program.title,
      description: program.summary,
      images: [{ url: program.image }],
    },
  };
}

export default async function VillageProgramRoute({
  params,
}: {
  params: Promise<{ slug: string; programSlug: string }>;
}) {
  const { slug, programSlug } = await params;
  const village = await getPublicVillageBySlug(slug);

  if (!village) notFound();

  const program = await resolveVillageProgram(village, programSlug);

  if (!program) notFound();

  return <VillageProgramPage program={program} village={village} />;
}
