import { NextResponse } from "next/server";
import { refreshExternalAnnouncementPipeline } from "@/lib/announcement-refresh";
import { authorizeCronRequest } from "@/lib/cron-security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authResult = authorizeCronRequest(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const result = await refreshExternalAnnouncementPipeline();

    return NextResponse.json(
      { data: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh external announcements.",
      },
      { status: 500 },
    );
  }
}
