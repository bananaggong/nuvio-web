import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  asVisibilityHoldReason,
  asVisibilityHoldStatus,
  listHostReviewVisibilityHoldsFromDb,
} from "@/lib/review-visibility-hold-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-review-visibility-holds:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const reason = asVisibilityHoldReason(url.searchParams.get("reason"));
    const status = asVisibilityHoldStatus(url.searchParams.get("status") ?? "active");
    const reviewId = url.searchParams.get("reviewId")?.trim() || undefined;
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await listHostReviewVisibilityHoldsFromDb(
      auth.profile.role === "admin"
        ? { limit, reason, reviewId, status }
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
            limit,
            reason,
            reviewId,
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