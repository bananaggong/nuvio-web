import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import {
  implementationStatus,
  summarizeImplementationStatus,
} from "@/lib/implementation-status";

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-implementation-status:get",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  return NextResponse.json({
    data: implementationStatus,
    summary: summarizeImplementationStatus(),
  });
}
