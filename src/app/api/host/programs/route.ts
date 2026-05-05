import { NextResponse } from "next/server";
import {
  listHostProgramDraftsFromDb,
  normalizeHostProgramDraft,
  upsertHostProgramDraft,
} from "@/lib/host-program-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const drafts = await listHostProgramDraftsFromDb();
    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host programs.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draft = normalizeHostProgramDraft(body);
    const savedDraft = await upsertHostProgramDraft(draft);

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save host program.",
      },
      { status: 400 },
    );
  }
}
