import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import {
  listMessageCampaignsFromDb,
  MessageCampaignAccessError,
  normalizeMessageCampaign,
  upsertMessageCampaign,
} from "@/lib/message-automation-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-message-campaign:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

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

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "host-message-campaign:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, 64 * 1024);
    if (response) return response;
    const campaign = normalizeMessageCampaign(body);
    const savedCampaign = await upsertMessageCampaign(campaign, {
      ownerId: auth.user.id,
      restrictToOwner: auth.profile.role !== "admin",
    });

    return NextResponse.json({ data: savedCampaign }, { status: 201 });
  } catch (error) {
    if (error instanceof MessageCampaignAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

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
