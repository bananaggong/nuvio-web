import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  readJsonWithLimit,
  getOptionalAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { hashReviewRequestToken } from "@/lib/review-request-token";
import {
  createParticipantReview,
  DuplicateReviewError,
  listPublicReviewsPageFromDb,
  PublicReviewCursorError,
  ReviewEligibilityError,
} from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const limited = await applyPersistentRateLimit(request, {
    key: "public-reviews:list",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const villageSlug = url.searchParams.get("villageSlug")?.trim() || undefined;
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
    const limit = Number(url.searchParams.get("limit") ?? "300");
    const page = await listPublicReviewsPageFromDb({ cursor, limit, villageSlug });
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof PublicReviewCursorError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load reviews.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const payloadTooLarge = enforceContentLength(request, 32 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const parsedBody = await readJsonWithLimit(request, 32 * 1024);
    if (parsedBody.response) return parsedBody.response;

    const body = parsedBody.body as Parameters<typeof createParticipantReview>[0];
    const auth = await getOptionalAuthenticatedUser();
    const requestTokenHash = hashReviewRequestToken(
      (body as { requestToken?: unknown }).requestToken,
    );

    if (!auth && !requestTokenHash) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const limited = await applyPersistentRateLimit(request, {
      identity: auth?.user.id ?? `review-request-token:${requestTokenHash}`,
      key: "review:create",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (limited) return limited;

    const savedDraft = await createParticipantReview(body, auth);
    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateReviewError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ReviewEligibilityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create review.",
      },
      { status: 400 },
    );
  }
}
