import { NextResponse } from "next/server";
import { processDueScheduledSmsMessages } from "@/lib/scheduled-message-db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleScheduledMessageCron(request);
}

export async function POST(request: Request) {
  return handleScheduledMessageCron(request);
}

async function handleScheduledMessageCron(request: Request) {
  const authResult = authorizeCronRequest(request);
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const result = await processDueScheduledSmsMessages({ limit });

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
            : "Failed to process scheduled messages.",
      },
      { status: 500 },
    );
  }
}

function authorizeCronRequest(request: Request):
  | { authorized: true }
  | { authorized: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return { authorized: true };
  }

  if (!secret) {
    return {
      authorized: false,
      status: 500,
      error: "CRON_SECRET is not configured.",
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  return { authorized: true };
}
