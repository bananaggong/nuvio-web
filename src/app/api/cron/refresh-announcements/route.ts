import { NextResponse } from "next/server";
import { refreshExternalAnnouncementPipeline } from "@/lib/announcement-refresh";
import { authorizeCronRequest } from "@/lib/cron-security";
import { processPendingNotificationEvents } from "@/lib/notification-db";
import { processDueScheduledSmsMessages } from "@/lib/scheduled-message-db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authResult = authorizeCronRequest(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const [announcements, pendingNotifications, scheduledSmsMessages] = await Promise.all([
      refreshExternalAnnouncementPipeline(),
      processPendingNotificationEvents({ limit: 100 }),
      processDueScheduledSmsMessages({ limit: 100 }),
    ]);

    return NextResponse.json(
      {
        data: {
          announcements,
          pendingNotifications,
          scheduledSmsMessages,
        },
      },
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
