import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import { listAuditLogs } from "@/lib/audit-log-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-audit-logs:list",
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const logs = await listAuditLogs({
      action: normalizeSearchParam(searchParams.get("action")),
      entityType: normalizeSearchParam(searchParams.get("entityType")),
      limit: Number(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load audit logs.",
      },
      { status: 500 },
    );
  }
}

function normalizeSearchParam(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
