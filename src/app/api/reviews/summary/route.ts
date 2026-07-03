import { NextResponse } from "next/server";
import { applyPersistentRateLimit } from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { getPublicReviewSummaryFromDb } from "@/lib/review-summary-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const limited = await applyPersistentRateLimit(request, {
    key: "public-reviews-summary:get",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const programIdentifier =
      url.searchParams.get("programId")?.trim() ||
      url.searchParams.get("program")?.trim() ||
      undefined;
    const villageSlug = url.searchParams.get("villageSlug")?.trim() || undefined;
    const summary = await getPublicReviewSummaryFromDb({
      programIdentifier,
      villageSlug,
    });

    return NextResponse.json({ data: summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review summary.",
      },
      { status: 500 },
    );
  }
}
