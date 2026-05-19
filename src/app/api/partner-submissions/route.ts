import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import {
  createPartnerSubmission,
  listPartnerSubmissions,
  normalizePartnerSubmissionInput,
} from "@/lib/partner-submission-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const submissions = await listPartnerSubmissions();
    return NextResponse.json({ data: submissions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load partner submissions.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const payloadTooLarge = enforceContentLength(request, 48 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "partner-submission:create",
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const submission = await createPartnerSubmission(
      normalizePartnerSubmissionInput(body),
    );

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create partner submission.",
      },
      { status: 400 },
    );
  }
}
