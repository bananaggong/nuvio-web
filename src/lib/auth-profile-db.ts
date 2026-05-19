import { eq, sql } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

export type AuthProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  phone: string;
  contactEmail: string;
  address: string;
  role: "user" | "partner" | "admin";
  onboardingIntent: OnboardingIntent | null;
  onboardingCompletedAt: string | null;
};

export type OnboardingIntent = "participant" | "host";

export type CompleteOnboardingInput = {
  address: string;
  contactEmail: string;
  displayName: string;
  intent: OnboardingIntent;
  phone: string;
};

export async function ensureUserProfile(user: User): Promise<AuthProfile> {
  const profile = buildProfileFromUser(user);
  const now = new Date();

  const [row] = await getDb()
    .insert(profiles)
    .values({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      phone: profile.phone,
      contactEmail: profile.contactEmail,
      address: profile.address,
      role: profile.role,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: profile.email,
        displayName: sql`coalesce(nullif(${profiles.displayName}, ''), ${profile.displayName})`,
        avatarUrl: sql`coalesce(nullif(${profiles.avatarUrl}, ''), ${profile.avatarUrl})`,
        phone: sql`coalesce(nullif(${profiles.phone}, ''), ${profile.phone})`,
        contactEmail: sql`coalesce(nullif(${profiles.contactEmail}, ''), ${profile.contactEmail})`,
        address: sql`coalesce(nullif(${profiles.address}, ''), ${profile.address})`,
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
  patch: Partial<
    Pick<AuthProfile, "displayName" | "phone" | "avatarUrl" | "contactEmail" | "address">
  >,
): Promise<AuthProfile | undefined> {
  const [row] = await getDb()
    .update(profiles)
    .set({
      displayName: patch.displayName,
      phone: patch.phone,
      avatarUrl: patch.avatarUrl,
      contactEmail: patch.contactEmail,
      address: patch.address,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  return row ? mapProfileRow(row) : undefined;
}

function buildProfileFromUser(user: User): AuthProfile {
  const metadata = user.user_metadata ?? {};
  const displayName =
    stringMetadata(metadata.full_name) ||
    stringMetadata(metadata.name) ||
    stringMetadata(metadata.nickname) ||
    user.email?.split("@")[0] ||
    "누비오 사용자";

  return {
    id: user.id,
    email: user.email ?? `${user.id}@users.nuvio.kr`,
    displayName,
    avatarUrl:
      stringMetadata(metadata.avatar_url) ||
      stringMetadata(metadata.picture) ||
      "",
    phone: stringMetadata(metadata.phone),
    contactEmail: stringMetadata(metadata.contact_email) || user.email || "",
    address: stringMetadata(metadata.address),
    role: "user",
    onboardingIntent: null,
    onboardingCompletedAt: null,
  };
}

function mapProfileRow(row: typeof profiles.$inferSelect): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? "",
    avatarUrl: row.avatarUrl ?? "",
    phone: row.phone ?? "",
    contactEmail: row.contactEmail ?? row.email,
    address: row.address ?? "",
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
