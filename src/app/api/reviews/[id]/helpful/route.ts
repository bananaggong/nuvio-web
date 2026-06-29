import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { ReviewInteractionError, setReviewHelpful } from "@/lib/review-interaction-db";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const contentLengthError = enforceContentLength(request, 4 * 1024);
  if (contentLengthError) return contentLengthError;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "review-helpful:set",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const helpful = body && typeof body === "object" && "helpful" in body
      ? (body as { helpful?: unknown }).helpful !== false
      : true;
    const result = await setReviewHelpful(id, helpful, auth);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ReviewInteractionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review reaction.",
      },
      { status: 500 },
    );
  }
}