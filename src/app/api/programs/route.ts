import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { listPublicPrograms } from "@/lib/public-program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = applyRateLimit(request, {
    key: "public-programs:list",
    limit: 300,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const programs = await listPublicPrograms();

  return NextResponse.json({ data: programs });
}
