import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processPendingNotificationEvents } from "@/lib/notification-db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleNotificationCron(request);
}

export async function POST(request: Request) {
  return handleNotificationCron(request);
}

async function handleNotificationCron(request: Request) {
  const authResult = authorizeCronRequest(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const limit = readCronLimit(request, { defaultLimit: 50, maxLimit: 100 });
    const result = await processPendingNotificationEvents({ limit });

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
            : "Failed to process notification events.",
      },
      { status: 500 },
    );
  }
}
