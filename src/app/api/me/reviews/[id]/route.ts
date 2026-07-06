import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  deleteParticipantReview,
  ReviewEligibilityError,
  updateParticipantReview,
} from "@/lib/review-db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const contentLengthError = enforceContentLength(request, 32 * 1024);
  if (contentLengthError) return contentLengthError;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "me-review:update",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 32 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = parsedBody.body as Parameters<typeof updateParticipantReview>[1];
    const review = await updateParticipantReview(id, body, auth);
    return NextResponse.json({ data: mapParticipantReviewMutationResponse(review) });
  } catch (error) {
    if (error instanceof ReviewEligibilityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "me-review:delete",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const result = await deleteParticipantReview(id, auth);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ReviewEligibilityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete review.",
      },
      { status: 400 },
    );
  }
}
type ParticipantReviewMutationResult = Awaited<ReturnType<typeof updateParticipantReview>>;

function mapParticipantReviewMutationResponse(review: ParticipantReviewMutationResult) {
  return {
    id: review.id,
    title: review.title,
    status: review.status,
    submittedAt: review.submittedAt,
    updatedAt: review.updatedAt,
  };
}
