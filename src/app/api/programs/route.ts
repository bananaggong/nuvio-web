import { NextResponse } from "next/server";
import { applyPersistentRateLimit } from "@/lib/api-security";
import { listPublicPrograms } from "@/lib/public-program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = await applyPersistentRateLimit(request, {
    key: "public-programs:list",
    limit: 300,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const programs = await listPublicPrograms();
  const searchParams = new URL(request.url).searchParams;
  const limit = boundedInteger(searchParams.get("limit"), 50, 1, 100);
  const offset = boundedInteger(searchParams.get("offset"), 0, 0, 500);
  const data = programs.slice(offset, offset + limit).map((program) => {
    const { contactEmail, phone, ...publicProgram } = program;
    void contactEmail;
    void phone;
    return publicProgram;
  });

  return NextResponse.json({
    data,
    meta: {
      hasMore: offset + data.length < programs.length,
      limit,
      offset,
    },
  });
}

function boundedInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(Math.max(parsed, min), max)
    : fallback;
}
