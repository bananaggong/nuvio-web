import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listHostReviewModerationChecksFromDb,
  type ReviewModerationRiskLevel,
} from "@/lib/review-moderation-check-db";

export const runtime = "nodejs";

const riskLevels: ReviewModerationRiskLevel[] = ["low", "medium", "high"];

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-moderation:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const requestedRiskLevel = url.searchParams.get("riskLevel")?.trim();
    const riskLevel = riskLevels.includes(requestedRiskLevel as ReviewModerationRiskLevel)
      ? (requestedRiskLevel as ReviewModerationRiskLevel)
      : undefined;
    if (requestedRiskLevel && !riskLevel) {
      return apiError("Invalid review moderation risk level.", 400);
    }

    const limit = Number(url.searchParams.get("limit") ?? "200");
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await listHostReviewModerationChecksFromDb(
      auth.profile.role === "admin"
        ? { limit, riskLevel }
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
            limit,
            riskLevel,
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review moderation checks.",
      },
      { status: 500 },
    );
  }
}
