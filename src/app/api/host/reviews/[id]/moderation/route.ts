import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  getHostReviewModerationCheckFromDb,
  refreshReviewModerationCheck,
  ReviewModerationAccessError,
  ReviewModerationCheckError,
} from "@/lib/review-moderation-check-db";

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
    key: "host-review-moderation:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await getHostReviewModerationCheckFromDb(
      id,
      auth.profile.role === "admin"
        ? {}
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReviewModerationAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewModerationCheckError) return apiError(error.message, 404);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review moderation check.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
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

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-moderation:refresh",
    limit: 80,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await refreshReviewModerationCheck(
      id,
      auth.profile.role === "admin"
        ? { actorId: auth.user.id }
        : {
            actorId: auth.user.id,
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReviewModerationAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewModerationCheckError) return apiError(error.message, 404);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh review moderation check.",
      },
      { status: 400 },
    );
  }
}