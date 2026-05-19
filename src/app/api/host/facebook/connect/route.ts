import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError, isApiAuthError, requireHostRole } from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  buildFacebookOAuthUrl,
  getFacebookOAuthConfig,
} from "@/lib/meta-graph";

export const runtime = "nodejs";

const STATE_COOKIE = "nuvio_facebook_oauth_state";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const villageSlug = requestUrl.searchParams.get("villageSlug") ?? "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

    const returnTo = normalizeReturnTo(
      requestUrl.searchParams.get("returnTo") ?? `/host/villages/${villageSlug}`,
    );
    const nonce = randomUUID();
    const state = Buffer.from(
      JSON.stringify({ nonce, returnTo, villageSlug }),
      "utf8",
    ).toString("base64url");
    const config = getFacebookOAuthConfig(requestUrl);
    const cookieStore = await cookies();

    cookieStore.set(STATE_COOKIE, nonce, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
    });

    return NextResponse.redirect(buildFacebookOAuthUrl(config, state));
  } catch (error) {
    return redirectWithStatus(
      "/host/villages/boseong",
      "facebook_error",
      error instanceof Error ? error.message : "Facebook connection failed.",
      requestUrl.origin,
    );
  }
}

function normalizeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/host/villages/boseong";
}

function redirectWithStatus(
  path: string,
  key: string,
  message: string,
  origin: string,
): NextResponse {
  const url = new URL(path, origin);
  url.searchParams.set(key, message);

  return NextResponse.redirect(url);
}
