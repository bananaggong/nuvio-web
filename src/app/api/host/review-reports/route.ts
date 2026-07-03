import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listHostReviewReports,
  ReviewReportAccessError,
  updateReviewReportStatus,
} from "@/lib/review-report-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-reports:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const reports = await listHostReviewReports(
      auth.profile.role === "admin"
        ? {}
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          },
    );

    return NextResponse.json({ data: reports });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load review reports.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, 32 * 1024);
    if (contentLengthError) return contentLengthError;

    const limited = await applyPersistentRateLimit(request, {
      key: "host-review-reports:update",
      limit: 120,
      windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const report = await updateReviewReportStatus(body, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
      allowedVillageIds:
        auth.profile.role === "admin"
          ? undefined
          : workspaces.map((workspace) => workspace.villageId),
      allowedVillageSlugs:
        auth.profile.role === "admin"
          ? undefined
          : workspaces.map((workspace) => workspace.slug),
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    if (error instanceof ReviewReportAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review report.",
      },
      { status: 400 },
    );
  }
}