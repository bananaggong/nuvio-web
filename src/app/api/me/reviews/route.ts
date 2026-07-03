import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { listMyReviewsFromDb } from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "me-reviews:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const reviews = await listMyReviewsFromDb(auth);
    return NextResponse.json({ data: reviews });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load my reviews.",
      },
      { status: 500 },
    );
  }
}