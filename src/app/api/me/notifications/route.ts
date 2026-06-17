import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  listUserNotifications,
  markUserNotificationsRead,
} from "@/lib/notification-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-notifications:list",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const notifications = await listUserNotifications(auth.user.id, {
    limit: 50,
    unreadOnly,
  });
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return NextResponse.json({ data: notifications, meta: { unreadCount } });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "me-notifications:patch",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as {
    ids?: unknown;
    markAllRead?: unknown;
  };
  const markAllRead =
    typeof body.markAllRead === "boolean" ? body.markAllRead : false;
  const ids = Array.isArray(body.ids)
    ? Array.from(new Set(body.ids.map((id) => String(id).trim()).filter(isUuid)))
        .slice(0, 100)
    : [];

  if (!markAllRead && ids.length === 0) {
    return NextResponse.json(
      { error: "Notification ids or markAllRead is required." },
      { status: 400 },
    );
  }

  await markUserNotificationsRead(auth.user.id, markAllRead ? [] : ids);
  return NextResponse.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
