import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/json-ld";
import { VillageProgramPage } from "@/components/village-program-page";
import {
  getPublicVillageBySlug,
  resolveVillageProgram,
} from "@/lib/village-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  programJsonLd,
} from "@/lib/seo";
import {
  canonicalVillagePath,
  canonicalVillageProgramPath,
} from "@/lib/village-routing";

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

  const canonicalPath = canonicalVillageProgramPath(village.slug, program.slug);

  return createSeoMetadata({
    title: `${program.title} | ${village.name}`,
    description: program.summary,
    image: program.image,
    keywords: [village.name, village.region, village.city, ...program.hashtags],
    path: canonicalPath,
  });
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
  const canonicalPath = canonicalVillageProgramPath(village.slug, program.slug);

  return (
    <>
      <JsonLdScript
        data={[
          programJsonLd(program, canonicalPath),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "로컬홈", path: "/villages" },
            { name: village.name, path: canonicalVillagePath(village.slug) },
            { name: program.title, path: canonicalPath },
          ]),
        ]}
      />
      <VillageProgramPage program={program} village={village} />
    </>
  );
}
