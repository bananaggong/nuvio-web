import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  readJsonWithLimit,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { markReviewRequestOpenedByTokenFromDb } from "@/lib/review-request-db";
import { hashReviewRequestToken } from "@/lib/review-request-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const contentLengthError = enforceContentLength(request, 8 * 1024);
  if (contentLengthError) return contentLengthError;

  const ipLimited = await applyPersistentRateLimit(request, {
    key: "review-request-open:ip",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (ipLimited) return ipLimited;

  try {
    const parsedBody = await readJsonWithLimit(request, 8 * 1024);
    if (parsedBody.response) return parsedBody.response;

    const body = parsedBody.body as {
      applicationId?: unknown;
      requestToken?: unknown;
    };
    const applicationId = typeof body.applicationId === "string"
      ? body.applicationId.trim()
      : "";
    const requestToken = typeof body.requestToken === "string"
      ? body.requestToken.trim()
      : "";
    const requestTokenHash = hashReviewRequestToken(requestToken);

    if (!applicationId || !requestTokenHash) {
      return NextResponse.json(
        { error: "A valid review request token is required." },
        { status: 400 },
      );
    }

    const tokenLimited = await applyPersistentRateLimit(request, {
      identity: requestTokenHash,
      key: "review-request-open:token",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (tokenLimited) return tokenLimited;

    const data = await markReviewRequestOpenedByTokenFromDb({
      applicationId,
      requestToken,
    });

    return NextResponse.json({
      data: data
        ? {
            id: data.id,
            status: data.status,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update review request.",
      },
      { status: 500 },
    );
  }
}