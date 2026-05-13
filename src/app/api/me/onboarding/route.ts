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

    await ensureUserProfile(user);
    const profile = await completeUserOnboarding(user.id, intent);

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
