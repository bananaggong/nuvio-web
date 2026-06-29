import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { listPublicReviewHostReplies } from "@/lib/review-reply-db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const limited = applyRateLimit(request, {
    key: "review-replies:list",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const replies = await listPublicReviewHostReplies(id);
    return NextResponse.json({ data: replies });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load review replies.",
      },
      { status: 500 },
    );
  }
}