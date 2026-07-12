import { NextResponse } from "next/server";
import {
  authorizeCronRequest,
  readCronLimit,
} from "@/lib/cron-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { processDueReviewRequestReminders } from "@/lib/review-request-db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleReviewRequestCron(request);
}

export async function POST(request: Request) {
  return handleReviewRequestCron(request);
}

async function handleReviewRequestCron(request: Request) {
  const authResult = authorizeCronRequest(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  if (!launchFeatureFlags.reviews) {
    return NextResponse.json(
      { data: { reason: "Reviews are disabled.", skipped: true } },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const limit = readCronLimit(request, { defaultLimit: 50, maxLimit: 100 });
    const result = await processDueReviewRequestReminders({ limit });

    return NextResponse.json(
      { data: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: result.failed > 0 ? 500 : 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process review request reminders.",
      },
      { status: 500 },
    );
  }
}
