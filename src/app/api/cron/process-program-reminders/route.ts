import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { processDueHostProgramRiskNotifications } from "@/lib/host-program-risk-notifications";
import { processDueHostOperationReminderNotifications } from "@/lib/host-operation-reminder-notifications";
import { processDueHostReportRiskNotifications } from "@/lib/host-report-risk-notifications";
import { processDueProgramReminderNotifications } from "@/lib/program-reminder-notifications";
import { runCronSteps } from "@/lib/cron-step-runner";

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
    const result = await runCronSteps({
      hostOperationReminders: () =>
        processDueHostOperationReminderNotifications({ limit }),
      hostProgramRisks: () => processDueHostProgramRiskNotifications({ limit }),
      hostReportRisks: () => processDueHostReportRiskNotifications({ limit }),
      programReminders: () => processDueProgramReminderNotifications({ limit }),
    });

    return NextResponse.json(
      {
        data: result.data,
        errors: result.errors,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: result.ok ? 200 : 500,
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
