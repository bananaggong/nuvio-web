import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  getHostApplicationDetail,
  updateHostApplicationStatus,
} from "@/lib/host-application-db";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { applicationStatusFlow } from "@/lib/host-operations";
import type { HostApplicationStatus } from "@/lib/host-operations";

export const runtime = "nodejs";

const applicationStatuses: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-application-detail:get",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
    }

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const application = await getHostApplicationDetail(id, { villageIds });

    if (!application) {
      return NextResponse.json(
        { error: "Application was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: application });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host application.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 4 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-application-status:update",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: HostApplicationStatus;
    };
    const status = body.status as HostApplicationStatus;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
    }

    if (!applicationStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const updated = await updateHostApplicationStatus(id, status, auth.user.id, {
      villageIds,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Application was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update host application.",
      },
      { status: 500 },
    );
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
