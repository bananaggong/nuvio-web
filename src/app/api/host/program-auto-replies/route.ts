import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
  type ApiAuthContext,
} from "@/lib/api-security";
import {
  getProgramAutoReplyConfigByProgramId,
  upsertProgramAutoReplyConfig,
} from "@/lib/program-auto-reply-db";
import {
  createDefaultProgramAutoReplyConfig,
  normalizeProgramAutoReplyConfig,
} from "@/lib/program-auto-replies";
import {
  listManageableHostVillageWorkspaces,
} from "@/lib/host-village-access";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-program-auto-replies:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const programIdentifier = searchParams.get("programId")?.trim() ?? "";
    const access = await resolveHostProgramAccess(programIdentifier, auth);

    if ("response" in access) return access.response;

    const config = await getProgramAutoReplyConfigByProgramId(access.program.id);
    return NextResponse.json({
      data: config ?? createDefaultProgramAutoReplyConfig(access.program.id),
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

export async function PUT(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 64 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-program-auto-replies:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const input = normalizeProgramAutoReplyConfig(body);
    const access = await resolveHostProgramAccess(input.programId, auth);

    if ("response" in access) return access.response;

    const config = await upsertProgramAutoReplyConfig({
      createdBy: auth.user.id,
      enabled: input.enabled,
      greeting: input.greeting,
      items: input.items,
      programId: access.program.id,
      villageId: access.program.villageId ?? undefined,
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save auto replies.",
      },
      { status: 400 },
    );
  }
}

async function resolveHostProgramAccess(
  programIdentifier: string,
  auth: ApiAuthContext,
) {
  if (!programIdentifier) {
    return {
      response: NextResponse.json(
        { error: "Program id is required." },
        { status: 400 },
      ),
    };
  }

  const program = await getProgramRecordByIdentifier(programIdentifier);
  if (!program) {
    return {
      response: NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      ),
    };
  }

  if (auth.profile.role === "admin") return { program };

  const allowedVillageIds = (await listManageableHostVillageWorkspaces(auth)).map(
    (workspace) => workspace.villageId,
  );
  if (!program.villageId || !allowedVillageIds.includes(program.villageId)) {
    return {
      response: NextResponse.json(
        { error: "이 프로그램의 자동응답을 관리할 권한이 없습니다." },
        { status: 403 },
      ),
    };
  }

  return { program };
}
