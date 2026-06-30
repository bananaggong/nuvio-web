import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
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

  const limited = applyRateLimit(request, {
    key: "host-review-visibility-holds:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const status = asVisibilityHoldStatus(url.searchParams.get("status") ?? "active");
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

    const limited = applyRateLimit(request, {
      key: "host-review-visibility-holds:release",
      limit: 80,
      windowMs: 15 * 60 * 1000,
    });
    if (limited) return limited;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
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
    if (error instanceof ReviewVisibilityHoldError) return apiError(error.message, 404);

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
