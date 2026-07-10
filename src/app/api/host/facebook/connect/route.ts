import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canAdminHostVillage } from "@/lib/host-village-access";
import {
  buildFacebookOAuthUrl,
  getFacebookOAuthConfig,
} from "@/lib/meta-graph";
import { getTrustedRequestOrigin } from "@/lib/trusted-request-origin";
import { isSafeRelativePath } from "@/lib/url-security";

export const runtime = "nodejs";

const STATE_COOKIE = "nuvio_facebook_oauth_state";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const limited = applyRateLimit(request, {
    key: "host-facebook-connect:start",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const villageSlug = requestUrl.searchParams.get("villageSlug") ?? "boseong";
    if (!(await canAdminHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const returnTo = normalizeReturnTo(
      requestUrl.searchParams.get("returnTo") ?? `/host/villages/${villageSlug}`,
    );
    const nonce = randomUUID();
    const state = Buffer.from(
      JSON.stringify({ nonce, returnTo, villageSlug }),
      "utf8",
    ).toString("base64url");
    const trustedAppUrl = new URL(getTrustedRequestOrigin(requestUrl));
    const config = getFacebookOAuthConfig(trustedAppUrl);
    const cookieStore = await cookies();

    cookieStore.set(STATE_COOKIE, nonce, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: trustedAppUrl.protocol === "https:",
    });

    return NextResponse.redirect(buildFacebookOAuthUrl(config, state));
  } catch {
    return redirectWithStatus(
      "/host/villages/boseong",
      "facebook_error",
      "Facebook connection could not be started.",
      getTrustedRequestOrigin(requestUrl),
    );
  }
}

function normalizeReturnTo(value: string): string {
  return isSafeRelativePath(value) ? value : "/host/villages/boseong";
}

function redirectWithStatus(
  path: string,
  key: string,
  message: string,
  origin: string,
): NextResponse {
  const url = new URL(normalizeReturnTo(path), origin);
  url.searchParams.set(key, message);

  return NextResponse.redirect(url);
}
