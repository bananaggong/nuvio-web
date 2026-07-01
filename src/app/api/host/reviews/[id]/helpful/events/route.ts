import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listHostReviewHelpfulVoteEventsFromDb,
  ReviewHelpfulVoteEventAccessError,
  ReviewHelpfulVoteEventError,
} from "@/lib/review-helpful-vote-event-db";

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
    key: "host-review-helpful-vote-events:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await listHostReviewHelpfulVoteEventsFromDb(
      id,
      auth.profile.role === "admin"
        ? { limit }
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
            limit,
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReviewHelpfulVoteEventAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewHelpfulVoteEventError) return apiError(error.message, 404);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review helpful vote events.",
      },
      { status: 500 },
    );
  }
}
