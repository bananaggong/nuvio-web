import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  listMessageCampaignsFromDb,
  normalizeMessageCampaign,
  upsertMessageCampaign,
} from "@/lib/message-automation-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const campaigns = await listMessageCampaignsFromDb(
      auth.profile.role === "admin" ? {} : { ownerId: auth.user.id },
    );
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
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = await request.json();
    const campaign = normalizeMessageCampaign(body);
    const savedCampaign = await upsertMessageCampaign(campaign, {
      ownerId: auth.user.id,
      restrictToOwner: auth.profile.role !== "admin",
    });

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
