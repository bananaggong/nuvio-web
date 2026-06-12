import { NextResponse } from "next/server";
import { getProgramAutoReplyConfigByIdentifier } from "@/lib/program-auto-reply-db";
import { createDefaultProgramAutoReplyConfig } from "@/lib/program-auto-replies";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programIdentifier = searchParams.get("programId")?.trim() ?? "";

    if (!programIdentifier) {
      return NextResponse.json(
        { error: "Program id is required." },
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
