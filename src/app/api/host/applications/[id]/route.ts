import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  getHostApplicationDetail,
  updateHostApplicationStatus,
} from "@/lib/host-application-db";
import { applicationStatusFlow } from "@/lib/host-operations";
import type { HostApplicationStatus } from "@/lib/host-operations";

export const runtime = "nodejs";

const applicationStatuses: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
    }

    const application = await getHostApplicationDetail(id);

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

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body.status as HostApplicationStatus;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
    }

    if (!applicationStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    await updateHostApplicationStatus(id, status, auth.user.id);

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
