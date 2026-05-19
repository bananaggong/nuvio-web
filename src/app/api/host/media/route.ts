import { NextResponse } from "next/server";
import { apiError, isApiAuthError, requireHostRole } from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  listHostVillageMediaFromDb,
  normalizeHostVillageMediaDraft,
  upsertHostVillageMediaDraft,
} from "@/lib/village-media-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

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
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = await request.json();
    const draft = normalizeHostVillageMediaDraft(body);
    if (!(await canManageHostVillage(auth, draft.villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

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
