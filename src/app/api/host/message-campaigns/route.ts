import { NextResponse } from "next/server";
import {
  listMessageCampaignsFromDb,
  normalizeMessageCampaign,
  upsertMessageCampaign,
} from "@/lib/message-automation-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const campaigns = await listMessageCampaignsFromDb();
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load message campaigns.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaign = normalizeMessageCampaign(body);
    const savedCampaign = await upsertMessageCampaign(campaign);

    return NextResponse.json({ data: savedCampaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save message campaign.",
      },
      { status: 400 },
    );
  }
}
