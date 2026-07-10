import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { isSupportedBrowserPushEndpoint } from "@/lib/browser-push";
import {
  deleteAllBrowserPushSubscriptions,
  deleteBrowserPushSubscription,
  listBrowserPushSubscriptions,
  upsertBrowserPushSubscription,
} from "@/lib/push-subscription-db";

export const runtime = "nodejs";

const MAX_PUSH_SUBSCRIPTION_BYTES = 8 * 1024;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-push-subscriptions:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const subscriptions = await listBrowserPushSubscriptions(auth.user.id);
  return NextResponse.json({
    data: {
      count: subscriptions.length,
      subscriptions,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-push-subscriptions:post",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { body: rawBody, response } = await readJsonWithLimit(
    request,
    MAX_PUSH_SUBSCRIPTION_BYTES,
  );
  if (response) return response;
  const body = rawBody as Record<string, unknown>;
  const parsed = parseBrowserPushSubscription(body);
  if (!parsed) {
    return apiError("Invalid push subscription.", 400);
  }

  const subscription = await upsertBrowserPushSubscription({
    ...parsed,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 512),
    userId: auth.user.id,
  });

  return NextResponse.json({ data: subscription }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-push-subscriptions:delete",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { body: rawBody, response } = await readJsonWithLimit(
    request,
    MAX_PUSH_SUBSCRIPTION_BYTES,
  );
  if (response) return response;
  const body = rawBody as Record<string, unknown>;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const deletedCount = endpoint
    ? await deleteBrowserPushSubscription(auth.user.id, endpoint)
    : await deleteAllBrowserPushSubscriptions(auth.user.id);

  return NextResponse.json({ data: { deletedCount } });
}

function parseBrowserPushSubscription(value: Record<string, unknown>):
  | {
      auth: string;
      endpoint: string;
      p256dh: string;
    }
  | null {
  const source =
    value.subscription &&
    typeof value.subscription === "object" &&
    !Array.isArray(value.subscription)
      ? (value.subscription as Record<string, unknown>)
      : value;

  const endpoint = typeof source.endpoint === "string" ? source.endpoint.trim() : "";
  const keys =
    source.keys && typeof source.keys === "object" && !Array.isArray(source.keys)
      ? (source.keys as Record<string, unknown>)
      : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys.auth === "string" ? keys.auth.trim() : "";

  if (!endpoint || !p256dh || !auth) return null;
  if (!isSupportedBrowserPushEndpoint(endpoint)) return null;
  if (endpoint.length > 2000 || p256dh.length > 500 || auth.length > 500) {
    return null;
  }

  return { auth, endpoint, p256dh };
}
