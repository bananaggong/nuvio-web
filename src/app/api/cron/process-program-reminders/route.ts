import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processDueHostProgramRiskNotifications } from "@/lib/host-program-risk-notifications";
import { processDueHostOperationReminderNotifications } from "@/lib/host-operation-reminder-notifications";
import { processDueHostReportRiskNotifications } from "@/lib/host-report-risk-notifications";
import { processPendingNotificationEvents } from "@/lib/notification-db";
import { processDueProgramReminderNotifications } from "@/lib/program-reminder-notifications";
import { processDueScheduledSmsMessages } from "@/lib/scheduled-message-db";

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
    const [
      programReminders,
      hostOperationReminders,
      hostProgramRisks,
      hostReportRisks,
    ] =
      await Promise.all([
        processDueProgramReminderNotifications({ limit }),
        processDueHostOperationReminderNotifications({ limit }),
        processDueHostProgramRiskNotifications({ limit }),
        processDueHostReportRiskNotifications({ limit }),
      ]);
    const pendingNotifications = await processPendingNotificationEvents({
      limit: Math.min(limit, 100),
    });
    const scheduledSmsMessages = await processDueScheduledSmsMessages({
      limit: Math.min(limit, 100),
    });

    return NextResponse.json(
      {
        data: {
          hostOperationReminders,
          hostProgramRisks,
          hostReportRisks,
          pendingNotifications,
          programReminders,
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
            : "Failed to process reminder notifications.",
      },
      { status: 500 },
    );
  }
}
