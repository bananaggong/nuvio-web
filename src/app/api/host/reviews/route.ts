import { NextResponse } from "next/server";
import { apiError, isApiAuthError, requireHostRole } from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  listHostReviewDraftsFromDb,
  normalizeHostReviewDraft,
  upsertHostReviewDraft,
} from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const drafts = await listHostReviewDraftsFromDb();
    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host reviews.",
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
    const draft = normalizeHostReviewDraft(body);
    if (
      draft.villageSlug &&
      !(await canManageHostVillage(auth, draft.villageSlug))
    ) {
      return apiError("You do not have permission to manage this village.", 403);
    }

    const savedDraft = await upsertHostReviewDraft(draft);

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save host review.",
      },
      { status: 400 },
    );
  }
}
