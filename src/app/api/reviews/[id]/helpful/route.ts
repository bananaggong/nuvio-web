import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
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

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "review-helpful:set",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 4 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const helpful = normalizeHelpfulRequest(parsedBody.body);
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

function normalizeHelpfulRequest(body: unknown): boolean {
  if (body === null || body === undefined) return true;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ReviewInteractionError("Helpful payload must be an object.");
  }

  if (!("helpful" in body)) return true;

  const helpful = (body as { helpful?: unknown }).helpful;
  if (typeof helpful !== "boolean") {
    throw new ReviewInteractionError("Helpful must be true or false.");
  }

  return helpful;
}
