import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  normalizeVillagePageSectionDraft,
  publishHostVillagePageSection,
} from "@/lib/village-page-cms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = await request.json();
    const draft = normalizeVillagePageSectionDraft(body);
    const publishedDraft = await publishHostVillagePageSection(draft);

    return NextResponse.json({ data: publishedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish village page section.",
      },
      { status: 400 },
    );
  }
}
