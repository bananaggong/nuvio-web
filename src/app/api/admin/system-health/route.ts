import { NextResponse } from "next/server";
import { isApiAuthError, requireAdminRole } from "@/lib/api-security";
import { getSystemHealthSnapshot } from "@/lib/system-health";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

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
