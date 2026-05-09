import { NextResponse } from "next/server";
import {
  listHostVillagePageSections,
  normalizeVillagePageSectionDraft,
  upsertHostVillagePageSection,
  type VillagePageKey,
} from "@/lib/village-page-cms";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    const pageKey = normalizePageKey(searchParams.get("pageKey"));
    const sections = await listHostVillagePageSections(villageSlug, pageKey);

    return NextResponse.json({ data: sections });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load village page sections.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draft = normalizeVillagePageSectionDraft(body);
    const savedDraft = await upsertHostVillagePageSection(draft);

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save village page section.",
      },
      { status: 400 },
    );
  }
}

function normalizePageKey(value: string | null): VillagePageKey {
  if (
    value === "about" ||
    value === "media" ||
    value === "programs" ||
    value === "reviews" ||
    value === "notice"
  ) {
    return value;
  }
  return "home";
}
