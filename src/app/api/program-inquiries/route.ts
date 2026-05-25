import { NextResponse } from "next/server";
import { createProgramInquiry } from "@/lib/host-inquiry-db";
import { normalizeHostInquiry } from "@/lib/host-inquiries";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inquiry = normalizeHostInquiry(body);

    if (!inquiry.programId) {
      return NextResponse.json(
        { error: "Program id is required." },
        { status: 400 },
      );
    }

    const program = await getProgramRecordByIdentifier(inquiry.programId);
    if (!program) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }

    const savedInquiry = await createProgramInquiry({
      ...inquiry,
      programId: program.id,
      programTitle: inquiry.programTitle || program.title,
      villageId: program.villageId ?? "",
    });

    return NextResponse.json({ data: savedInquiry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save inquiry.",
      },
      { status: 400 },
    );
  }
}
