import { NextResponse } from "next/server";
import {
  enforceContentLength,
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

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const preference = await getNotificationPreference(auth.user.id);
  return NextResponse.json({ data: preference });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

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
  return /^\d{2}:\d{2}$/u.test(text) ? text : "";
}

const booleanPreferenceKeys = [
  "announcementEnabled",
  "applicationStatusEnabled",
  "emailEnabled",
  "inAppEnabled",
  "kakaoEnabled",
  "marketingEnabled",
  "programDeadlineEnabled",
  "smsEnabled",
] as const;
