import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
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

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const limited = applyRateLimit(request, {
    key: "public-reviews:list",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

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

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "review:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const draft = normalizeHostReviewDraft({
      ...body,
      id: `public-review-${Date.now()}`,
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
    if (draft.title.length > 120) {
      throw new Error("후기 제목은 120자 이하로 입력해 주세요.");
    }
    if (draft.body.trim().length < 10) {
      throw new Error("후기 내용을 10자 이상 입력해 주세요.");
    }
    if (draft.body.length > 5000) {
      throw new Error("후기 내용은 5000자 이하로 입력해 주세요.");
    }
    if (draft.excerpt.length > 300) {
      throw new Error("후기 요약은 300자 이하로 입력해 주세요.");
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
