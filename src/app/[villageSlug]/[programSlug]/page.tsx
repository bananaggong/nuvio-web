import { notFound, permanentRedirect } from "next/navigation";
import { isReservedChannelSlug } from "@/lib/channel-routing";
import { programPath } from "@/lib/program-routing";
import {
  getPublicVillageBySlug,
  resolveVillageProgram,
} from "@/lib/village-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LegacyShortVillageProgramRoute({
  params,
}: {
  params: Promise<{ villageSlug: string; programSlug: string }>;
}) {
  const { villageSlug, programSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const program = await resolveVillageProgram(village, programSlug);
  if (!program) notFound();

  permanentRedirect(programPath(program));
}
