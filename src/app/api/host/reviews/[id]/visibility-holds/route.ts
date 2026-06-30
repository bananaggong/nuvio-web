import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  asVisibilityHoldStatus,
  listHostReviewVisibilityHoldsFromDb,
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