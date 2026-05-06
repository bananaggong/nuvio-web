import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VillageProgramPage } from "@/components/village-program-page";
import {
  getPublicVillageBySlug,
  resolveVillageProgram,
} from "@/lib/village-db";
import { isReservedVillageSlug } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ villageSlug: string; programSlug: string }>;
}): Promise<Metadata> {
  const { villageSlug, programSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
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

export default async function ShortVillageProgramRoute({
  params,
}: {
  params: Promise<{ villageSlug: string; programSlug: string }>;
}) {
  const { villageSlug, programSlug } = await params;
  if (isReservedVillageSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const program = await resolveVillageProgram(village, programSlug);
  if (!program) notFound();

  return <VillageProgramPage program={program} village={village} />;
}
