import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processDueHostOperationReminderNotifications } from "@/lib/host-operation-reminder-notifications";
import { processDueProgramReminderNotifications } from "@/lib/program-reminder-notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleReminderCron(request);
}

export async function POST(request: Request) {
  return handleReminderCron(request);
}

async function handleReminderCron(request: Request) {
  const authResult = authorizeCronRequest(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const limit = readCronLimit(request, { defaultLimit: 100, maxLimit: 300 });
    const [programReminders, hostOperationReminders] = await Promise.all([
      processDueProgramReminderNotifications({ limit }),
      processDueHostOperationReminderNotifications({ limit }),
    ]);

    return NextResponse.json(
      {
        data: {
          hostOperationReminders,
          programReminders,
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
            : "Failed to process reminder notifications.",
      },
      { status: 500 },
    );
  }
}
