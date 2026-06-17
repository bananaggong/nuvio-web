import { NextResponse } from "next/server";
import {
  completeUserOnboarding,
  type OnboardingIntent,
} from "@/lib/auth-profile-db";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payloadTooLarge = enforceContentLength(request, 8 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-onboarding:complete",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const auth = await requireAuthenticatedUser();
    if (isApiAuthError(auth)) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const intent = normalizeIntent(body.intent);
    if (!intent) {
      return NextResponse.json(
        { error: "Invalid onboarding intent." },
        { status: 400 },
      );
    }

    const displayName = normalizeRequiredText(body.displayName, 80);
    const phone = normalizeRequiredText(body.phone, 40);
    const contactEmail = normalizeRequiredText(body.contactEmail, 120);
    const address = normalizeRequiredText(body.address, 200);

    if (!displayName || !phone || !contactEmail || !address) {
      return NextResponse.json(
        { error: "이름, 전화번호, 연락 가능한 이메일, 주소를 모두 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!isValidEmail(contactEmail)) {
      return NextResponse.json(
        { error: "연락 가능한 이메일 형식을 확인해 주세요." },
        { status: 400 },
      );
    }

    const profile = await completeUserOnboarding(auth.user.id, {
      address,
      contactEmail,
      displayName,
      intent,
      phone,
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete onboarding.",
      },
      { status: 500 },
    );
  }
}

function normalizeIntent(value: unknown): OnboardingIntent | null {
  return value === "participant" || value === "host" ? value : null;
}

function normalizeRequiredText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
