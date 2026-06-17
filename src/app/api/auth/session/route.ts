import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { ensureUserProfile, getUserProfile } from "@/lib/auth-profile-db";
import { getLocalDevAuthContext } from "@/lib/local-dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = applyRateLimit(request, {
    key: "auth-session:get",
    limit: 240,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const localDevAuth = await getLocalDevAuthContext();
    if (localDevAuth) {
      return NextResponse.json({
        data: {
          user: {
            id: localDevAuth.user.id,
            email: localDevAuth.user.email,
            appMetadata: sanitizeAppMetadata(localDevAuth.user.app_metadata),
            userMetadata: sanitizeUserMetadata(localDevAuth.user.user_metadata),
          },
          profile: localDevAuth.profile,
        },
      });
    }

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
          appMetadata: sanitizeAppMetadata(user.app_metadata),
          userMetadata: sanitizeUserMetadata(user.user_metadata),
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

function sanitizeAppMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return pickMetadata(metadata, ["provider", "providers"]);
}

function sanitizeUserMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return pickMetadata(metadata, [
    "address",
    "avatar_url",
    "email",
    "full_name",
    "name",
    "phone",
    "picture",
  ]);
}

function pickMetadata(
  metadata: Record<string, unknown> | undefined,
  allowedKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!metadata) return result;

  for (const key of allowedKeys) {
    const value = metadata[key];
    if (typeof value === "string") {
      const text = value.trim().slice(0, 500);
      if (text) result[key] = text;
    } else if (Array.isArray(value)) {
      const values = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 10);
      if (values.length > 0) result[key] = values;
    }
  }

  return result;
}
