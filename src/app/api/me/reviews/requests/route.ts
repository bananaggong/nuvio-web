import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { listMyReviewRequestsFromDb } from "@/lib/review-request-db";

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