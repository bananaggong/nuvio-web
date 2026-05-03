import { NextResponse } from "next/server";
import { announcements } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: announcements });
}
