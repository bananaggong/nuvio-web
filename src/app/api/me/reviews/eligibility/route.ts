import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  getMyReviewEligibilityFromDb,
  listMyReviewEligibilitiesFromDb,
  type ReviewEligibility,
} from "@/lib/review-eligibility-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "me-reviews-eligibility:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId")?.trim();
    const limit = Number(url.searchParams.get("limit") ?? "100");

    if (applicationId) {
      const eligibility = await getMyReviewEligibilityFromDb(applicationId, auth);
      return NextResponse.json({
        data: eligibility ? mapMyReviewEligibilityResponse(eligibility) : null,
      });
    }

    const eligibilities = await listMyReviewEligibilitiesFromDb(auth, { limit });
    return NextResponse.json({
      data: eligibilities.map(mapMyReviewEligibilityResponse),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review eligibility.",
      },
      { status: 500 },
    );
  }
}
type MyReviewEligibilityResponse = {
  applicationId: string;
  eligible: boolean;
  existingReview?: ReviewEligibility["existingReview"];
  programSlug?: string;
  programTitle: string;
  reason: ReviewEligibility["reason"];
  status: string;
  villageSlug?: string;
  writeUrl?: string;
};

function mapMyReviewEligibilityResponse(
  eligibility: ReviewEligibility,
): MyReviewEligibilityResponse {
  return {
    applicationId: eligibility.applicationId,
    eligible: eligibility.eligible,
    existingReview: eligibility.existingReview,
    programSlug: eligibility.programSlug,
    programTitle: eligibility.programTitle,
    reason: eligibility.reason,
    status: eligibility.status,
    villageSlug: eligibility.villageSlug,
    writeUrl: eligibility.writeUrl,
  };
}
