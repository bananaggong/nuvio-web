import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { updateHostInquiryStatus } from "@/lib/host-inquiry-db";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import type { HostInquiryStatus } from "@/lib/host-inquiries";

export const runtime = "nodejs";

const inquiryStatuses: HostInquiryStatus[] = [
  "new",
  "inReview",
  "answered",
  "closed",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "host-inquiry-status:update",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const { body: rawBody, response } = await readJsonWithLimit(request, 4 * 1024);
    if (response) return response;
    const body = rawBody as {
      status?: HostInquiryStatus;
    };
    const status = body.status;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
    }

    if (!status || !inquiryStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const inquiry = await updateHostInquiryStatus(id, status, { villageIds });

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: inquiry });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update inquiry.",
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
