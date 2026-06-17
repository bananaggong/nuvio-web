import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { getProgramAutoReplyConfigByIdentifier } from "@/lib/program-auto-reply-db";
import { createDefaultProgramAutoReplyConfig } from "@/lib/program-auto-replies";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = applyRateLimit(request, {
    key: "program-auto-replies:read",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const programIdentifier = searchParams.get("programId")?.trim() ?? "";

    if (!programIdentifier) {
      return NextResponse.json(
        { error: "Program id is required." },
        { status: 400 },
      );
    }
    if (programIdentifier.length > 160) {
      return NextResponse.json(
        { error: "Program id is too long." },
        { status: 400 },
      );
    }

    const program = await getProgramRecordByIdentifier(programIdentifier);
    const config = await getProgramAutoReplyConfigByIdentifier(programIdentifier);

    return NextResponse.json({
      data: config ?? createDefaultProgramAutoReplyConfig(program?.id ?? programIdentifier),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load auto replies.",
      },
      { status: 500 },
    );
  }
}
