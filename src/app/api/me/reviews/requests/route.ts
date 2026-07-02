import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listMyReviewRequestsFromDb,
  markMyReviewRequestOpenedFromDb,
} from "@/lib/review-request-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-review-requests:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const includeCompleted = url.searchParams.get("includeCompleted") === "true";
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const data = await listMyReviewRequestsFromDb(auth, { includeCompleted, limit });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load my review requests.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const contentLengthError = enforceContentLength(request, 8 * 1024);
  if (contentLengthError) return contentLengthError;

  const limited = applyRateLimit(request, {
    key: "me-review-requests:opened",
    limit: 80,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      applicationId?: unknown;
    };
    const applicationId =
      typeof body.applicationId === "string" ? body.applicationId.trim() : "";

    if (!applicationId) {
      return NextResponse.json(
        { error: "A valid application id is required." },
        { status: 400 },
      );
    }

    const data = await markMyReviewRequestOpenedFromDb(applicationId, auth);
    return NextResponse.json({ data });
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
