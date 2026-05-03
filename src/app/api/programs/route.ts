import { NextResponse } from "next/server";
import { programs } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: programs });
}
