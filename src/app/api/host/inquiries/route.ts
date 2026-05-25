import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import { listHostInquiriesFromDb } from "@/lib/host-inquiry-db";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const programIdentifier = searchParams.get("programId")?.trim();
    const program = programIdentifier
      ? await getProgramRecordByIdentifier(programIdentifier)
      : undefined;
    const workspaces =
      auth.profile.role === "admin" ? [] : await listHostVillageWorkspaces(auth);
    const allowedVillageIds = workspaces.map((workspace) => workspace.villageId);

    if (programIdentifier && !program) {
      return NextResponse.json({ data: [] });
    }

    if (
      auth.profile.role !== "admin" &&
      program?.villageId &&
      !allowedVillageIds.includes(program.villageId)
    ) {
      return NextResponse.json(
        { error: "이 프로그램의 문의를 볼 권한이 없습니다." },
        { status: 403 },
      );
    }

    const inquiries = await listHostInquiriesFromDb({
      programId: program?.id,
      villageIds: auth.profile.role === "admin" ? undefined : allowedVillageIds,
    });

    return NextResponse.json({ data: inquiries });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load inquiries.",
      },
      { status: 500 },
    );
  }
}
