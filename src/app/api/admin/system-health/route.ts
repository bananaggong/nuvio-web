import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import { getSystemHealthSnapshot } from "@/lib/system-health";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-system-health:get",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const snapshot = await getSystemHealthSnapshot();
    return NextResponse.json(
      { data: snapshot },
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
            : "Failed to load system health.",
      },
      { status: 500 },
    );
  }
}
