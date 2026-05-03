import { NextResponse } from "next/server";
import { reviews } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: reviews });
}
