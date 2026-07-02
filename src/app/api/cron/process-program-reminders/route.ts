import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processDueHostProgramRiskNotifications } from "@/lib/host-program-risk-notifications";
import { processDueHostOperationReminderNotifications } from "@/lib/host-operation-reminder-notifications";
import { processPendingNotificationEvents } from "@/lib/notification-db";
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
    const [programReminders, hostOperationReminders, hostProgramRisks] =
      await Promise.all([
        processDueProgramReminderNotifications({ limit }),
        processDueHostOperationReminderNotifications({ limit }),
        processDueHostProgramRiskNotifications({ limit }),
      ]);
    const pendingNotifications = await processPendingNotificationEvents({
      limit: Math.min(limit, 100),
    });

    return NextResponse.json(
      {
        data: {
          hostOperationReminders,
          hostProgramRisks,
          pendingNotifications,
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
