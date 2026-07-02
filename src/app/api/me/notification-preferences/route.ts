import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  getNotificationPreference,
  updateNotificationPreference,
  type NotificationPreference,
} from "@/lib/notification-db";

export const runtime = "nodejs";

type PreferencePatch = Partial<
  Pick<
    NotificationPreference,
    | "announcementEnabled"
    | "applicationStatusEnabled"
    | "browserPushEnabled"
    | "emailEnabled"
    | "inAppEnabled"
    | "kakaoEnabled"
    | "marketingEnabled"
    | "programDeadlineEnabled"
    | "quietHoursEnd"
    | "quietHoursStart"
    | "smsEnabled"
  >
>;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-notification-preferences:get",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const preference = await getNotificationPreference(auth.user.id);
  return NextResponse.json({ data: preference });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "me-notification-preferences:patch",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = normalizePreferencePatch(body);
  const preference = await updateNotificationPreference(auth.user.id, patch);

  return NextResponse.json({ data: preference });
}

function normalizePreferencePatch(body: Record<string, unknown>): PreferencePatch {
  const patch: PreferencePatch = {};

  for (const key of booleanPreferenceKeys) {
    if (typeof body[key] === "boolean") {
      patch[key] = body[key];
    }
  }

  if (typeof body.quietHoursStart === "string") {
    patch.quietHoursStart = normalizeTime(body.quietHoursStart);
  }

  if (typeof body.quietHoursEnd === "string") {
    patch.quietHoursEnd = normalizeTime(body.quietHoursEnd);
  }

  return patch;
}

function normalizeTime(value: string): string {
  const text = value.trim();
  const match = /^(\d{2}):(\d{2})$/u.exec(text);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return text;
}

const booleanPreferenceKeys = [
  "announcementEnabled",
  "applicationStatusEnabled",
  "browserPushEnabled",
  "emailEnabled",
  "inAppEnabled",
  "kakaoEnabled",
  "marketingEnabled",
  "programDeadlineEnabled",
  "smsEnabled",
] as const;
