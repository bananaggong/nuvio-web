import { NextResponse } from "next/server";
import {
  enforceContentLength,
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

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const body = (await request.json().catch(() => ({}))) as {
    ids?: unknown;
    markAllRead?: unknown;
  };
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id).trim()).filter(isUuid)
    : [];

  if (!body.markAllRead && ids.length === 0) {
    return NextResponse.json(
      { error: "Notification ids or markAllRead is required." },
      { status: 400 },
    );
  }

  await markUserNotificationsRead(auth.user.id, body.markAllRead ? [] : ids);
  return NextResponse.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
