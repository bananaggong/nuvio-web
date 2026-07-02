import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processDueProgramReminderNotifications } from "@/lib/program-reminder-notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleProgramReminderCron(request);
}

export async function POST(request: Request) {
  return handleProgramReminderCron(request);
}

async function handleProgramReminderCron(request: Request) {
  const authResult = authorizeCronRequest(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const limit = readCronLimit(request, { defaultLimit: 100, maxLimit: 300 });
    const result = await processDueProgramReminderNotifications({ limit });

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
            : "Failed to process program reminders.",
      },
      { status: 500 },
    );
  }
}
