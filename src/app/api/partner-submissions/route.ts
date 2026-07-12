import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  enforceSameOrigin,
  readJsonWithLimit,
} from "@/lib/api-security";
import {
  createPartnerSubmission,
  normalizePartnerSubmissionInput,
} from "@/lib/partner-submission-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    key: "partner-submission:create",
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, 48 * 1024);
    if (response) return response;
    await createPartnerSubmission(
      normalizePartnerSubmissionInput(body),
    );

    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
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
