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
  asVisibilityHoldStatus,
  listHostReviewVisibilityHoldsFromDb,
  releaseHostReviewVisibilityHoldFromDb,
  ReviewVisibilityHoldAccessError,
  ReviewVisibilityHoldError,
} from "@/lib/review-visibility-hold-db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-visibility-holds:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status") ?? "active";
    const status = asVisibilityHoldStatus(requestedStatus);
    if (!status) return apiError("Invalid visibility hold status.", 400);

    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await listHostReviewVisibilityHoldsFromDb(
      auth.profile.role === "admin"
        ? { reviewId: id, status }
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
            reviewId: id,
            status,
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review visibility holds.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, 16 * 1024);
    if (contentLengthError) return contentLengthError;

    const limited = await applyPersistentRateLimit(request, {
      key: "host-review-visibility-holds:release",
      limit: 80,
      windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
    });
    if (limited) return limited;

    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 16 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = asJsonRecord(parsedBody.body);
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await releaseHostReviewVisibilityHoldFromDb(
      { ...body, reviewId: id },
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
    if (error instanceof ReviewVisibilityHoldAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewVisibilityHoldError) {
      const status = error.message.includes("already released")
        ? 409
        : error.message.includes("required") || error.message.includes("valid")
          ? 400
          : 404;
      return apiError(
        error.message,
        status,
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to release review visibility hold.",
      },
      { status: 400 },
    );
  }
}
