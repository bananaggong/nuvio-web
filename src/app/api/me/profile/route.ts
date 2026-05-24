import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  getUserProfile,
  type ProfileGender,
  updateUserProfile,
} from "@/lib/auth-profile-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));
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
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureUserProfile(user);
    const body = await request.json();
    const profile = await updateUserProfile(user.id, {
      fullName: normalizeText(body.fullName),
      displayName: normalizeText(body.displayName),
      loginId: normalizeText(body.loginId),
      phone: normalizeText(body.phone),
      contactEmail: normalizeText(body.contactEmail),
      address: normalizeText(body.address),
      addressDetail: normalizeText(body.addressDetail),
      avatarUrl: normalizeText(body.avatarUrl),
      gender: normalizeGender(body.gender),
      birthDate: normalizeBirthDate(body.birthDate),
      paymentMethod: normalizeText(body.paymentMethod),
      refundBank: normalizeText(body.refundBank),
      refundAccount: normalizeText(body.refundAccount),
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

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeGender(value: unknown): ProfileGender | "" | undefined {
  const normalized = normalizeText(value);
  if (normalized === undefined) return undefined;
  if (!normalized) return "";
  if (normalized === "female" || normalized === "male" || normalized === "neutral") {
    return normalized;
  }
  throw new Error("Invalid gender.");
}

function normalizeBirthDate(value: unknown): string | null | undefined {
  if (value === null) return null;

  const normalized = normalizeText(value);
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
