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
  createReviewReport,
  DuplicateReviewReportError,
} from "@/lib/review-report-db";

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

  const contentLengthError = enforceContentLength(request, 16 * 1024);
  if (contentLengthError) return contentLengthError;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "review-report:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const report = await createReviewReport({ ...body, reviewId: id }, auth);
    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateReviewReportError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to report review.",
      },
      { status: 400 },
    );
  }
}