import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { listPublicVillageMedia } from "@/lib/village-media-db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ villageSlug: string }> },
) {
  const limited = applyRateLimit(request, {
    key: "public-village-media:list",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { villageSlug } = await params;
  const media = await listPublicVillageMedia(villageSlug);

  return NextResponse.json({ data: media });
}
