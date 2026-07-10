import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  ApplicationFormAccessError,
  ApplicationFormDeleteBlockedError,
  deleteApplicationFormTemplate,
  type HostFormScope,
} from "@/lib/application-form-db";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-form:delete",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    let hostScope: HostFormScope | undefined;
    if (auth.profile.role !== "admin") {
      const workspaces = await listManageableHostVillageWorkspaces(auth);
      if (workspaces.length === 0) throw new ApplicationFormAccessError();
      hostScope = {
        ownerId: auth.user.id,
        villageIds: workspaces.map((workspace) => workspace.villageId),
      };
    }
    const deleted = await deleteApplicationFormTemplate(decodeURIComponent(id), {
      hostScope,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "신청서 양식을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    if (error instanceof ApplicationFormAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ApplicationFormDeleteBlockedError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "신청서 양식을 삭제하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
