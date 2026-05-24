import { eq, sql } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

export type ProfileGender = "female" | "male" | "neutral";
export type OnboardingIntent = "participant" | "host";

export type AuthProfile = {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  loginId: string;
  avatarUrl: string;
  phone: string;
  contactEmail: string;
  address: string;
  addressDetail: string;
  gender: ProfileGender | "";
  birthDate: string | null;
  paymentMethod: string;
  refundBank: string;
  refundAccount: string;
  role: "user" | "partner" | "admin";
  onboardingIntent: OnboardingIntent | null;
  onboardingCompletedAt: string | null;
};

export type CompleteOnboardingInput = {
  address: string;
  contactEmail: string;
  displayName: string;
  intent: OnboardingIntent;
  phone: string;
};

type ProfilePatch = Partial<
  Pick<
    AuthProfile,
    | "fullName"
    | "displayName"
    | "loginId"
    | "phone"
    | "avatarUrl"
    | "contactEmail"
    | "address"
    | "addressDetail"
    | "gender"
    | "birthDate"
    | "paymentMethod"
    | "refundBank"
    | "refundAccount"
  >
>;

export async function ensureUserProfile(user: User): Promise<AuthProfile> {
  const profile = buildProfileFromUser(user);
  const now = new Date();

  const [row] = await getDb()
    .insert(profiles)
    .values({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      displayName: profile.displayName,
      loginId: profile.loginId,
      avatarUrl: profile.avatarUrl,
      phone: profile.phone,
      contactEmail: profile.contactEmail,
      address: profile.address,
      addressDetail: profile.addressDetail,
      gender: profile.gender,
      birthDate: profile.birthDate,
      paymentMethod: profile.paymentMethod,
      refundBank: profile.refundBank,
      refundAccount: profile.refundAccount,
      role: profile.role,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: profile.email,
        fullName: sql`coalesce(nullif(${profiles.fullName}, ''), ${profile.fullName})`,
        displayName: sql`coalesce(nullif(${profiles.displayName}, ''), ${profile.displayName})`,
        loginId: sql`coalesce(nullif(${profiles.loginId}, ''), ${profile.loginId})`,
        avatarUrl: sql`coalesce(nullif(${profiles.avatarUrl}, ''), ${profile.avatarUrl})`,
        phone: sql`coalesce(nullif(${profiles.phone}, ''), ${profile.phone})`,
        contactEmail: sql`coalesce(nullif(${profiles.contactEmail}, ''), ${profile.contactEmail})`,
        address: sql`coalesce(nullif(${profiles.address}, ''), ${profile.address})`,
        addressDetail: sql`coalesce(nullif(${profiles.addressDetail}, ''), ${profile.addressDetail})`,
        gender: sql`coalesce(nullif(${profiles.gender}, ''), ${profile.gender})`,
        birthDate: sql`coalesce(${profiles.birthDate}, ${profile.birthDate})`,
        paymentMethod: sql`coalesce(nullif(${profiles.paymentMethod}, ''), ${profile.paymentMethod})`,
        refundBank: sql`coalesce(nullif(${profiles.refundBank}, ''), ${profile.refundBank})`,
        refundAccount: sql`coalesce(nullif(${profiles.refundAccount}, ''), ${profile.refundAccount})`,
        updatedAt: now,
      },
    })
    .returning();

  return mapProfileRow(row);
}

export async function completeUserOnboarding(
  userId: string,
  input: CompleteOnboardingInput,
): Promise<AuthProfile | undefined> {
  const [row] = await getDb()
    .update(profiles)
    .set({
      displayName: input.displayName,
      phone: input.phone,
      contactEmail: input.contactEmail,
      address: input.address,
      onboardingIntent: input.intent,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  return row ? mapProfileRow(row) : undefined;
}

export function isProfileOnboardingComplete(
  profile: AuthProfile | null | undefined,
): boolean {
  return Boolean(
    profile?.onboardingCompletedAt &&
      profile.displayName.trim() &&
      profile.phone.trim() &&
      profile.contactEmail.trim() &&
      profile.address.trim(),
  );
}

export async function getUserProfile(
  userId: string,
): Promise<AuthProfile | undefined> {
  const [row] = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return row ? mapProfileRow(row) : undefined;
}

export async function updateUserProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<AuthProfile | undefined> {
  const [row] = await getDb()
    .update(profiles)
    .set({
      fullName: patch.fullName,
      displayName: patch.displayName,
      loginId: patch.loginId,
      phone: patch.phone,
      avatarUrl: patch.avatarUrl,
      contactEmail: patch.contactEmail,
      address: patch.address,
      addressDetail: patch.addressDetail,
      gender: patch.gender,
      birthDate: patch.birthDate,
      paymentMethod: patch.paymentMethod,
      refundBank: patch.refundBank,
      refundAccount: patch.refundAccount,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  return row ? mapProfileRow(row) : undefined;
}

function buildProfileFromUser(user: User): AuthProfile {
  const metadata = user.user_metadata ?? {};
  const fullName =
    stringMetadata(metadata.full_name) || stringMetadata(metadata.name);
  const loginId = user.email?.split("@")[0] ?? "";
  const displayName =
    stringMetadata(metadata.nickname) || fullName || loginId || "Nuvio user";

  return {
    id: user.id,
    email: user.email ?? `${user.id}@users.nuvio.kr`,
    fullName,
    displayName,
    loginId,
    avatarUrl:
      stringMetadata(metadata.avatar_url) ||
      stringMetadata(metadata.picture) ||
      "",
    phone: stringMetadata(metadata.phone),
    contactEmail: stringMetadata(metadata.contact_email) || user.email || "",
    address: stringMetadata(metadata.address),
    addressDetail: stringMetadata(metadata.address_detail),
    gender: genderMetadata(metadata.gender),
    birthDate: dateMetadata(metadata.birth_date),
    paymentMethod: stringMetadata(metadata.payment_method),
    refundBank: stringMetadata(metadata.refund_bank),
    refundAccount: stringMetadata(metadata.refund_account),
    role: "user",
    onboardingIntent: null,
    onboardingCompletedAt: null,
  };
}

function mapProfileRow(row: typeof profiles.$inferSelect): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName ?? "",
    displayName: row.displayName ?? "",
    loginId: row.loginId ?? "",
    avatarUrl: row.avatarUrl ?? "",
    phone: row.phone ?? "",
    contactEmail: row.contactEmail ?? row.email,
    address: row.address ?? "",
    addressDetail: row.addressDetail ?? "",
    gender: genderMetadata(row.gender),
    birthDate: dateMetadata(row.birthDate),
    paymentMethod: row.paymentMethod ?? "",
    refundBank: row.refundBank ?? "",
    refundAccount: row.refundAccount ?? "",
    role: row.role,
    onboardingIntent:
      row.onboardingIntent === "participant" || row.onboardingIntent === "host"
        ? row.onboardingIntent
        : null,
    onboardingCompletedAt: row.onboardingCompletedAt
      ? row.onboardingCompletedAt.toISOString()
      : null,
  };
}

function stringMetadata(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function genderMetadata(value: unknown): ProfileGender | "" {
  return value === "female" || value === "male" || value === "neutral" ? value : "";
}

function dateMetadata(value: unknown): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}
