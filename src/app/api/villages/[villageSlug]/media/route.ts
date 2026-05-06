import { NextResponse } from "next/server";
import { listPublicVillageMedia } from "@/lib/village-media-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ villageSlug: string }> },
) {
  const { villageSlug } = await params;
  const media = await listPublicVillageMedia(villageSlug);

  return NextResponse.json({ data: media });
}
