import { NextResponse } from "next/server";
import {
  getUserProfile,
  isDisplayNameAvailable,
  type ProfileGender,
  updateUserProfile,
} from "@/lib/auth-profile-db";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = applyRateLimit(request, {
    key: "me-profile:get",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const auth = await requireAuthenticatedUser();
    if (isApiAuthError(auth)) return auth.response;

    const profile = (await getUserProfile(auth.user.id)) ?? auth.profile;
    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load profile.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-profile:update",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const auth = await requireAuthenticatedUser();
    if (isApiAuthError(auth)) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const displayName = normalizeText(body.displayName, 80);

    if (displayName !== undefined && !displayName) {
      return NextResponse.json(
        { error: "닉네임을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (
      displayName &&
      normalizeDisplayNameForComparison(displayName) !==
        normalizeDisplayNameForComparison(auth.profile.displayName)
    ) {
      const available = await isDisplayNameAvailable(displayName, auth.user.id);
      if (!available) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임입니다." },
          { status: 409 },
        );
      }
    }

    const profile = await updateUserProfile(auth.user.id, {
      fullName: normalizeText(body.fullName, 80),
      displayName,
      loginId: normalizeText(body.loginId, 40),
      phone: normalizeText(body.phone, 40),
      contactEmail: normalizeContactEmail(body.contactEmail),
      address: normalizeText(body.address, 200),
      addressDetail: normalizeText(body.addressDetail, 200),
      avatarUrl: normalizeAvatarUrl(body.avatarUrl),
      gender: normalizeGender(body.gender),
      birthDate: normalizeBirthDate(body.birthDate),
      paymentMethod: normalizeText(body.paymentMethod, 80),
      refundBank: normalizeText(body.refundBank, 80),
      refundAccount: normalizeText(body.refundAccount, 80),
      showHostCenterNav: normalizeNullableBoolean(body.showHostCenterNav),
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile.",
      },
      { status: 400 },
    );
  }
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : undefined;
}

function normalizeDisplayNameForComparison(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  throw new Error("Invalid boolean value.");
}

function normalizeContactEmail(value: unknown): string | undefined {
  const normalized = normalizeText(value, 120);
  if (normalized === undefined || !normalized) return normalized;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) {
    throw new Error("Invalid contact email.");
  }
  return normalized.toLowerCase();
}

function normalizeAvatarUrl(value: unknown): string | undefined {
  const normalized = normalizeText(value, 500);
  if (normalized === undefined || !normalized) return normalized;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Invalid avatar URL.");
    }
    return url.toString();
  } catch {
    throw new Error("Invalid avatar URL.");
  }
}

function normalizeGender(value: unknown): ProfileGender | "" | undefined {
  const normalized = normalizeText(value, 20);
  if (normalized === undefined) return undefined;
  if (!normalized) return "";
  if (normalized === "female" || normalized === "male" || normalized === "neutral") {
    return normalized;
  }
  throw new Error("Invalid gender.");
}

function normalizeBirthDate(value: unknown): string | null | undefined {
  if (value === null) return null;

  const normalized = normalizeText(value, 10);
  if (normalized === undefined) return undefined;
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Invalid birth date.");
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error("Invalid birth date.");
  }

  return normalized;
}
