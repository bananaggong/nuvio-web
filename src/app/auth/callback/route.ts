import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  isProfileOnboardingComplete,
  type AuthProfile,
  type OnboardingIntent,
} from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTrustedRequestOrigin } from "@/lib/trusted-request-origin";
import { isSafeRelativePath } from "@/lib/url-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const intent = getSafeOnboardingIntent(requestUrl.searchParams.get("intent"));

  if (!code) {
    return redirectToTrustedPath("/login?error=missing_code", requestUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToTrustedPath("/login?error=auth_callback", requestUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await ensureUserProfile(user) : null;
  const redirectPath = getPostAuthRedirectPath(profile, next, intent);

  return redirectToTrustedPath(redirectPath, requestUrl);
}

function getSafeNextPath(value: string | null): string | null {
  return value && isSafeRelativePath(value) ? value : null;
}

function redirectToTrustedPath(path: string, requestUrl: URL): NextResponse {
  const safePath = isSafeRelativePath(path) ? path : "/";
  return NextResponse.redirect(
    new URL(safePath, getTrustedRequestOrigin(requestUrl)),
  );
}

function getSafeOnboardingIntent(value: string | null): OnboardingIntent | null {
  return value === "participant" || value === "host" ? value : null;
}

function getPostAuthRedirectPath(
  profile: AuthProfile | null,
  next: string | null,
  intent: OnboardingIntent | null,
): string {
  if (profile?.role === "admin" || profile?.role === "partner") {
    return next ?? getRoleLandingPath(profile.role);
  }

  if (!isProfileOnboardingComplete(profile)) {
    if (next?.startsWith("/onboarding")) return next;
    const onboardingUrl = new URLSearchParams();
    if (intent) onboardingUrl.set("intent", intent);
    if (next) onboardingUrl.set("next", next);
    const query = onboardingUrl.toString();
    return query ? `/onboarding?${query}` : "/onboarding";
  }

  return next ?? getRoleLandingPath(profile?.role);
}

function getRoleLandingPath(role?: "user" | "partner" | "admin"): string {
  if (role === "admin") return "/admin/magazine";
  if (role === "partner") return "/host";
  return "/mypage";
}
