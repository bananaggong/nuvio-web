import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

export type AuthProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  phone: string;
  role: "user" | "partner" | "admin";
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
      role: profile.role,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        updatedAt: now,
      },
    })
    .returning();

  return mapProfileRow(row);
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
  patch: Partial<Pick<AuthProfile, "displayName" | "phone" | "avatarUrl">>,
): Promise<AuthProfile | undefined> {
  const [row] = await getDb()
    .update(profiles)
    .set({
      displayName: patch.displayName,
      phone: patch.phone,
      avatarUrl: patch.avatarUrl,
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
    "NUVIO user";

  return {
    id: user.id,
    email: user.email ?? `${user.id}@nuvio.local`,
    displayName,
    avatarUrl:
      stringMetadata(metadata.avatar_url) ||
      stringMetadata(metadata.picture) ||
      "",
    phone: stringMetadata(metadata.phone),
    role: "user",
  };
}

function mapProfileRow(row: typeof profiles.$inferSelect): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? "",
    avatarUrl: row.avatarUrl ?? "",
    phone: row.phone ?? "",
    role: row.role,
  };
}

function stringMetadata(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
