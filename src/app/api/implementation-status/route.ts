import { NextResponse } from "next/server";
import {
  implementationStatus,
  summarizeImplementationStatus,
} from "@/lib/implementation-status";

export function GET() {
  return NextResponse.json({
    data: implementationStatus,
    summary: summarizeImplementationStatus(),
  });
}
