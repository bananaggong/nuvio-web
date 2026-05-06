import { NextResponse } from "next/server";
import {
  listHostVillageMediaFromDb,
  normalizeHostVillageMediaDraft,
  upsertHostVillageMediaDraft,
} from "@/lib/village-media-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    const drafts = await listHostVillageMediaFromDb(villageSlug);

    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load host media.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draft = normalizeHostVillageMediaDraft(body);
    const savedDraft = await upsertHostVillageMediaDraft(draft);

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save host media.",
      },
      { status: 400 },
    );
  }
}
