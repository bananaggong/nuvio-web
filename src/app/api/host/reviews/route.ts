import { NextResponse } from "next/server";
import {
  listHostReviewDraftsFromDb,
  normalizeHostReviewDraft,
  upsertHostReviewDraft,
} from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET() {
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
  try {
    const body = await request.json();
    const draft = normalizeHostReviewDraft(body);
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
