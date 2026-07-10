import { notFound, permanentRedirect } from "next/navigation";
import { programPath } from "@/lib/program-routing";
import {
  getPublicVillageBySlug,
  resolveVillageProgram,
} from "@/lib/village-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LegacyVillageProgramRoute({
  params,
}: {
  params: Promise<{ slug: string; programSlug: string }>;
}) {
  const { slug, programSlug } = await params;
  const village = await getPublicVillageBySlug(slug);
  if (!village) notFound();

  const program = await resolveVillageProgram(village, programSlug);
  if (!program) notFound();

  permanentRedirect(programPath(program));
}
