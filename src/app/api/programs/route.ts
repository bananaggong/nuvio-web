import { NextResponse } from "next/server";
import { listPublicPrograms } from "@/lib/public-program-db";

export const runtime = "nodejs";

export async function GET() {
  const programs = await listPublicPrograms();

  return NextResponse.json({ data: programs });
}
