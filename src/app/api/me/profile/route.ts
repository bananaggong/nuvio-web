import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  getUserProfile,
  updateUserProfile,
} from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));
    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load profile.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureUserProfile(user);
    const body = await request.json();
    const profile = await updateUserProfile(user.id, {
      displayName: normalizeText(body.displayName),
      phone: normalizeText(body.phone),
      avatarUrl: normalizeText(body.avatarUrl),
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}
