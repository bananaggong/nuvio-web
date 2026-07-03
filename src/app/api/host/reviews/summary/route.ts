import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { getHostReviewModerationSummary } from "@/lib/review-moderation-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-reviews-summary:get",
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
    const summary = await getHostReviewModerationSummary(
      auth.profile.role === "admin"
        ? {}
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          },
    );

    return NextResponse.json({ data: summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review moderation summary.",
      },
      { status: 500 },
    );
  }
}