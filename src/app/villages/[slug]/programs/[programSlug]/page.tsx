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
  canonicalChannelPath,
  canonicalChannelProgramPath,
} from "@/lib/channel-routing";

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

  const canonicalPath = canonicalChannelProgramPath(village.slug, program.slug);

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
  const canonicalPath = canonicalChannelProgramPath(village.slug, program.slug);

  return (
    <>
      <JsonLdScript
        data={[
          programJsonLd(program, canonicalPath),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "채널", path: "/channels" },
            { name: village.name, path: canonicalChannelPath(village.slug) },
            { name: program.title, path: canonicalPath },
          ]),
        ]}
      />
      <VillageProgramPage program={program} village={village} />
    </>
  );
}
