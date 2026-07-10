import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { upsertHostSocialConnection } from "@/lib/host-social-connections-db";
import { canAdminHostVillage } from "@/lib/host-village-access";
import { getTrustedRequestOrigin } from "@/lib/trusted-request-origin";
import {
  exchangeFacebookCode,
  fetchFacebookPages,
  fetchFacebookUser,
  getFacebookOAuthConfig,
  getInstagramAccount,
  selectInstagramPage,
} from "@/lib/meta-graph";
import { isSafeRelativePath } from "@/lib/url-security";

export const runtime = "nodejs";

const STATE_COOKIE = "nuvio_facebook_oauth_state";

type OAuthState = {
  nonce: string;
  returnTo: string;
  villageSlug: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const fallbackReturnTo = "/host/villages/boseong";
  let returnTo = fallbackReturnTo;
  const limited = applyRateLimit(request, {
    key: "host-facebook-callback:complete",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const state = parseState(requestUrl.searchParams.get("state"));
    returnTo = normalizeReturnTo(state.returnTo || fallbackReturnTo);

    const cookieStore = await cookies();
    const expectedNonce = cookieStore.get(STATE_COOKIE)?.value;
    if (!expectedNonce || expectedNonce !== state.nonce) {
      throw new Error("Facebook connection state is invalid. Please try again.");
    }
    const auth = await requireHostRole();
    if (isApiAuthError(auth)) {
      throw new Error("Host login is required to complete Facebook connection.");
    }
    if (!(await canAdminHostVillage(auth, state.villageSlug))) {
      throw new Error("You do not have permission to connect this channel.");
    }

    const error = requestUrl.searchParams.get("error_description");
    if (error) throw new Error(error);

    const code = requestUrl.searchParams.get("code");
    if (!code) throw new Error("Facebook authorization code is missing.");

    const config = getFacebookOAuthConfig(
      new URL(getTrustedRequestOrigin(requestUrl)),
    );
    const token = await exchangeFacebookCode(config, code);
    const [facebookUser, pages] = await Promise.all([
      fetchFacebookUser(config.graphVersion, token.accessToken),
      fetchFacebookPages(config.graphVersion, token.accessToken),
    ]);
    const page = selectInstagramPage(pages);
    if (!page) {
      throw new Error(
        "No Facebook Page with a connected Instagram professional account was found.",
      );
    }

    const instagram = getInstagramAccount(page);
    if (!instagram) {
      throw new Error("The selected Facebook Page has no Instagram account.");
    }

    await upsertHostSocialConnection({
      villageSlug: state.villageSlug,
      provider: "facebook",
      facebookUserId: facebookUser.id,
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramUserId: instagram.id,
      instagramUsername: instagram.username ?? instagram.name,
      accessToken: token.accessToken,
      tokenExpiresAt: token.expiresAt,
      permissions: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
      status: "connected",
      lastSyncError: null,
      raw: {
        facebookUser,
        page: {
          id: page.id,
          name: page.name,
          instagram_business_account: page.instagram_business_account,
          connected_instagram_account: page.connected_instagram_account,
        },
      },
    });

    return redirectWithStatus(
      returnTo,
      "facebook",
      "connected",
      STATE_COOKIE,
      getTrustedRequestOrigin(requestUrl),
    );
  } catch {
    return redirectWithStatus(
      returnTo,
      "facebook_error",
      "Facebook connection failed. Please try again.",
      STATE_COOKIE,
      getTrustedRequestOrigin(requestUrl),
    );
  }
}

function parseState(value: string | null): OAuthState {
  if (!value) throw new Error("Facebook connection state is missing.");

  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
    nonce?: unknown;
    returnTo?: unknown;
    villageSlug?: unknown;
  };

  if (typeof parsed.nonce !== "string") {
    throw new Error("Facebook connection state is malformed.");
  }

  return {
    nonce: parsed.nonce,
    returnTo:
      typeof parsed.returnTo === "string"
        ? parsed.returnTo
        : "/host/villages/boseong",
    villageSlug:
      typeof parsed.villageSlug === "string" ? parsed.villageSlug : "boseong",
  };
}

function normalizeReturnTo(value: string): string {
  return isSafeRelativePath(value) ? value : "/host/villages/boseong";
}

function redirectWithStatus(
  path: string,
  key: string,
  message: string,
  cookieName: string,
  origin: string,
): NextResponse {
  const url = new URL(normalizeReturnTo(path), origin);
  url.searchParams.set(key, message);

  const response = NextResponse.redirect(url);
  response.cookies.delete(cookieName);

  return response;
}
