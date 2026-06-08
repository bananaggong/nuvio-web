import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
} from "@/lib/api-security";
import { reviews } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listPublicReviewsFromDb,
  normalizeHostReviewDraft,
  upsertHostReviewDraft,
} from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET() {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const fallbackReviews = isDemoModeEnabled() ? reviews : [];

  try {
    const databaseReviews = await listPublicReviewsFromDb();
    return NextResponse.json({ data: [...databaseReviews, ...fallbackReviews] });
  } catch {
    return NextResponse.json({ data: fallbackReviews });
  }
}

export async function POST(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const payloadTooLarge = enforceContentLength(request, 32 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "review:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const draft = normalizeHostReviewDraft({
      ...body,
      author: typeof body.author === "string" ? body.author : "익명",
      excerpt:
        typeof body.excerpt === "string"
          ? body.excerpt
          : String(body.body ?? "").slice(0, 120),
      published: false,
    });

    if (draft.title.trim().length < 2) {
      throw new Error("후기 제목을 입력해 주세요.");
    }
    if (draft.body.trim().length < 10) {
      throw new Error("후기 내용을 10자 이상 입력해 주세요.");
    }

    const savedDraft = await upsertHostReviewDraft(draft);
    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create review.",
      },
      { status: 400 },
    );
  }
}
