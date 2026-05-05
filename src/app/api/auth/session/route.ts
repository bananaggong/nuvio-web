import { NextResponse } from "next/server";
import { ensureUserProfile, getUserProfile } from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: { user: null, profile: null } });
    }

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          appMetadata: user.app_metadata,
          userMetadata: user.user_metadata,
        },
        profile,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load session.",
      },
      { status: 500 },
    );
  }
}
