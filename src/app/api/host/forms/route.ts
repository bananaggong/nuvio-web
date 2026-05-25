import { NextResponse } from "next/server";
import {
  isApiAuthError,
  requireHostRole,
  type ApiAuthContext,
} from "@/lib/api-security";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import {
  listApplicationFormTemplatesFromDb,
  normalizeApplicationFormTemplate,
  upsertApplicationFormTemplate,
} from "@/lib/application-form-db";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const templates = await listApplicationFormTemplatesFromDb(
      auth.profile.role === "admin" ? {} : { ownerId: auth.user.id },
    );
    return NextResponse.json({ data: templates });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load application forms.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = await request.json();
    const template = normalizeApplicationFormTemplate(body);
    const scopedTemplate = await scopeTemplateToProgram(template, auth);
    const savedTemplate = await upsertApplicationFormTemplate(scopedTemplate, {
      ownerId: auth.user.id,
      restrictToOwner: auth.profile.role !== "admin",
    });

    return NextResponse.json({ data: savedTemplate }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save application form.",
      },
      { status: 400 },
    );
  }
}

async function scopeTemplateToProgram(
  template: ApplicationFormTemplate,
  auth: ApiAuthContext,
): Promise<ApplicationFormTemplate> {
  const programId = template.programId?.trim();
  if (!programId) return template;

  const program = await getProgramRecordByIdentifier(programId);
  if (!program) {
    throw new Error("Connected program was not found.");
  }

  if (auth.profile.role !== "admin") {
    const allowedVillageIds = (await listHostVillageWorkspaces(auth)).map(
      (workspace) => workspace.villageId,
    );

    if (!program.villageId || !allowedVillageIds.includes(program.villageId)) {
      throw new Error(
        "이 계정에 연결된 로컬페이지 프로그램에만 신청서를 연결할 수 있습니다.",
      );
    }
  }

  return {
    ...template,
    programId: program.id,
    programTitle: program.title,
  };
}
