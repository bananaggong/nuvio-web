import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
  type ApiAuthContext,
} from "@/lib/api-security";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import { asFormKind } from "@/lib/application-form-builder";
import {
  ApplicationFormAccessError,
  listApplicationFormTemplatesFromDb,
  normalizeApplicationFormTemplate,
  upsertApplicationFormTemplate,
} from "@/lib/application-form-db";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-form:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const requestedKind = searchParams.get("kind");
    const formKind =
      requestedKind === "application" || requestedKind === "inquiry"
        ? asFormKind(requestedKind)
        : undefined;
    const templates = await listApplicationFormTemplatesFromDb(
      auth.profile.role === "admin"
        ? { formKind }
        : { formKind, ownerId: auth.user.id },
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

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 256 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-form:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const template = normalizeApplicationFormTemplate(body);
    const scopedTemplate = await scopeTemplateToProgram(template, auth);
    const savedTemplate = await upsertApplicationFormTemplate(scopedTemplate, {
      ownerId: auth.user.id,
      restrictToOwner: auth.profile.role !== "admin",
    });

    return NextResponse.json({ data: savedTemplate }, { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationFormAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

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
    const allowedVillageIds = (await listManageableHostVillageWorkspaces(auth)).map(
      (workspace) => workspace.villageId,
    );

    if (!program.villageId || !allowedVillageIds.includes(program.villageId)) {
      throw new Error(
        "이 계정에 연결된 채널 프로그램에만 신청서를 연결할 수 있습니다.",
      );
    }
  }

  return {
    ...template,
    programId: program.id,
    programTitle: program.title,
  };
}
