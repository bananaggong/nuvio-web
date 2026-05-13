import { NextResponse } from "next/server";
import { isApiAuthError, requireAdminRole } from "@/lib/api-security";
import {
  implementationStatus,
  summarizeImplementationStatus,
} from "@/lib/implementation-status";

export async function GET() {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  return NextResponse.json({
    data: implementationStatus,
    summary: summarizeImplementationStatus(),
  });
}
