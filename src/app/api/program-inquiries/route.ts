import { NextResponse } from "next/server";
import { getOptionalAuthenticatedUser } from "@/lib/api-security";
import { createProgramInquiry } from "@/lib/host-inquiry-db";
import { normalizeHostInquiry } from "@/lib/host-inquiries";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import { getPublicProgramByIdentifier } from "@/lib/public-program-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inquiry = normalizeHostInquiry(body);
    const auth = await getOptionalAuthenticatedUser();

    if (!inquiry.programId) {
      return NextResponse.json(
        { error: "Program id is required." },
        { status: 400 },
      );
    }

    const programRecord = await getProgramRecordByIdentifier(inquiry.programId);
    const publicProgram = programRecord
      ? null
      : await getPublicProgramByIdentifier(inquiry.programId);
    if (!programRecord && !publicProgram) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }

    const savedInquiry = await createProgramInquiry({
      ...inquiry,
      programId: programRecord?.id ?? String(publicProgram?.id ?? inquiry.programId),
      programTitle:
        inquiry.programTitle || programRecord?.title || publicProgram?.title || "",
      submittedBy: auth?.user.id ?? inquiry.submittedBy,
      villageId: programRecord?.villageId ?? "",
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
