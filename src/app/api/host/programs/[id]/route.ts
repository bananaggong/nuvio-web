import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import { listApplicationFormTemplatesFromDb } from "@/lib/application-form-db";
import {
  deleteHostProgramDraftFromDb,
  getHostProgramDraftFromDb,
} from "@/lib/host-program-db";
import { getProgramPublishBlockers } from "@/lib/host-program-publish-readiness";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";
import type { HostProgramDraft } from "@/lib/host-program-studio";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid program id." }, { status: 400 });
    }

    const allowedVillageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const program = await getHostProgramDraftFromDb(id, { allowedVillageIds });

    if (!program) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }

    const applicationForms = await listApplicationFormTemplatesFromDb(
      auth.profile.role === "admin"
        ? { formKind: "application" }
        : { formKind: "application", ownerId: auth.user.id },
    );
    const linkedApplicationForm = applicationForms.find((form) =>
      isLinkedProgramForm(form, program),
    );
    const blockers = getProgramPublishBlockers(program, {
      applicationForm: linkedApplicationForm,
    });

    if (program.published || blockers.length === 0) {
      return NextResponse.json(
        {
          error:
            "온보딩이 완료된 프로그램은 대시보드의 빠른 삭제 버튼으로 삭제할 수 없습니다.",
        },
        { status: 409 },
      );
    }

    const deletedProgram = await deleteHostProgramDraftFromDb(id, {
      allowedVillageIds,
    });

    if (!deletedProgram) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: deletedProgram });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete program.",
      },
      { status: 500 },
    );
  }
}

function isLinkedProgramForm(
  form: { programId?: string; programTitle: string },
  draft: HostProgramDraft,
): boolean {
  return (
    Boolean(form.programId && form.programId === draft.id) ||
    normalizeIdentifier(form.programTitle) === normalizeIdentifier(draft.title)
  );
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
