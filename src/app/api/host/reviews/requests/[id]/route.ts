import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  asJsonRecord,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  ReviewRequestAccessError,
  ReviewRequestEligibilityError,
  updateHostReviewRequestStatus,
} from "@/lib/review-request-db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const contentLengthError = enforceContentLength(request, 8 * 1024);
  if (contentLengthError) return contentLengthError;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-requests:update",
    limit: 80,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 8 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = asJsonRecord(parsedBody.body);
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await updateHostReviewRequestStatus(
      { ...body, id },
      auth.profile.role === "admin"
        ? { actorId: auth.user.id, actorRole: auth.profile.role }
        : {
            actorId: auth.user.id,
            actorRole: auth.profile.role,
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReviewRequestAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewRequestEligibilityError) return apiError(error.message, 400);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update review request.",
      },
      { status: 400 },
    );
  }
}