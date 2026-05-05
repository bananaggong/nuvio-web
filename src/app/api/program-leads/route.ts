import { NextResponse } from "next/server";
import { getAnnouncementRefreshSeconds } from "@/lib/live-announcements";
import {
  createDraftFromProgramLead,
  normalizeProgramLeadPayload,
  rejectProgramLead,
} from "@/lib/program-lead-db";
import { getProgramLeadFeed } from "@/lib/program-leads";

export const runtime = "nodejs";

export async function GET() {
  const feed = await getProgramLeadFeed();
  const refreshSeconds = getAnnouncementRefreshSeconds();

  return NextResponse.json(
    { data: feed.items, meta: feed.meta },
    {
      headers: {
        "Cache-Control": `s-maxage=${refreshSeconds}, stale-while-revalidate=60`,
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lead = normalizeProgramLeadPayload(body.lead);
    const action = String(body.action ?? "");

    if (action === "createDraft") {
      const draft = await createDraftFromProgramLead(lead);
      return NextResponse.json(
        { data: { decision: "approved", draft } },
        { status: 201 },
      );
    }

    if (action === "reject") {
      await rejectProgramLead(lead);
      return NextResponse.json({ data: { decision: "rejected" } });
    }

    return NextResponse.json(
      { error: "Unsupported program lead action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update program lead.",
      },
      { status: 400 },
    );
  }
}
