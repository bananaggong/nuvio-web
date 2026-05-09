import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await ensureUserProfile(user) : null;
  const redirectPath = next ?? getRoleLandingPath(profile?.role);

  const forwardedHost = requestUrl.hostname === "localhost"
    ? null
    : requestUrl.host;

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}

function getSafeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function getRoleLandingPath(role?: "user" | "partner" | "admin"): string {
  if (role === "admin") return "/admin";
  if (role === "partner") return "/host";
  return "/me";
}
