import { NextResponse } from "next/server";
import {
  completeUserOnboarding,
  ensureUserProfile,
  type OnboardingIntent,
} from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const intent = normalizeIntent(body.intent);
    if (!intent) {
      return NextResponse.json(
        { error: "Invalid onboarding intent." },
        { status: 400 },
      );
    }

    const displayName = normalizeRequiredText(body.displayName);
    const phone = normalizeRequiredText(body.phone);
    const contactEmail = normalizeRequiredText(body.contactEmail);
    const address = normalizeRequiredText(body.address);

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

    await ensureUserProfile(user);
    const profile = await completeUserOnboarding(user.id, {
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

function normalizeRequiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /.+@.+\..+/.test(value);
}
