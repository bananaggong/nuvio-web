import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export type CronAuthorizationResult =
  | { authorized: true }
  | { authorized: false; response: NextResponse };

export function authorizeCronRequest(request: Request): CronAuthorizationResult {
  const secret = process.env.CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return { authorized: true };
  }

  if (!secret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!constantTimeEquals(token, secret)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { authorized: true };
}

export function readCronLimit(
  request: Request,
  options: { defaultLimit: number; maxLimit: number; minLimit?: number },
): number {
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  const numericLimit = rawLimit ? Number(rawLimit) : options.defaultLimit;
  const minLimit = options.minLimit ?? 1;

  if (!Number.isFinite(numericLimit)) return options.defaultLimit;

  return Math.max(
    minLimit,
    Math.min(options.maxLimit, Math.floor(numericLimit)),
  );
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}
