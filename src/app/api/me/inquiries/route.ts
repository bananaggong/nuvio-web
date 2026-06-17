import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { listUserProgramInquiriesFromDb } from "@/lib/host-inquiry-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-inquiries:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const inquiries = await listUserProgramInquiriesFromDb(auth.user.id);
    return NextResponse.json({ data: inquiries });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load my inquiries.",
      },
      { status: 500 },
    );
  }
}
