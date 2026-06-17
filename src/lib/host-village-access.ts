import { and, desc, eq, isNull } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db/client";
import {
  hostVillageMemberships,
  villages,
} from "@/db/schema";
import {
  ensureUserProfile,
  getUserProfile,
  type AuthProfile,
} from "@/lib/auth-profile-db";
import type { ApiAuthContext } from "@/lib/api-security";
import { getLocalDevAuthContext } from "@/lib/local-dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HostVillageWorkspace = {
  accountEmail: string;
  city: string;
  consolePath: string;
  editorPath: string;
  heroImage: string;
  membershipId: string;
  publicPath: string;
  region: string;
  role: "owner" | "manager" | "editor" | "viewer";
  slug: string;
  status: "pending" | "active" | "revoked";
  summary: string;
  title: string;
  villageId: string;
};

export type HostConsoleOverview = {
  isAdmin: boolean;
  profile: AuthProfile | null;
  signedIn: boolean;
  user: User | null;
  workspaces: HostVillageWorkspace[];
};

export type HostVillageAccessResult =
  | { allowed: true; profile: AuthProfile; user: User }
  | { allowed: false; reason: "signedOut" | "forbidden"; profile?: AuthProfile; user?: User };

type WorkspaceRow = {
  accountEmail: string | null;
  city: string;
  heroImage: string;
  membershipId: string | null;
  region: string;
  role: "owner" | "manager" | "editor" | "viewer" | null;
  slug: string;
  status: "pending" | "active" | "revoked" | null;
  summary: string;
  title: string;
  villageId: string;
};

export async function getHostConsoleOverview(): Promise<HostConsoleOverview> {
  const session = await getCurrentHostSession();
  if (!session) {
    return {
      isAdmin: false,
      profile: null,
      signedIn: false,
      user: null,
      workspaces: [],
    };
  }

  const workspaces = await listHostVillageWorkspaces(session);

  return {
    isAdmin: session.profile.role === "admin",
    profile: session.profile,
    signedIn: true,
    user: session.user,
    workspaces,
  };
}

export async function getCurrentHostSession(): Promise<ApiAuthContext | null> {
  try {
    const localDevAuth = await getLocalDevAuthContext();
    if (localDevAuth) {
      await activatePendingHostVillageMemberships(
        localDevAuth.profile.id,
        localDevAuth.profile.email,
      );
      return localDevAuth;
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));
    await activatePendingHostVillageMemberships(profile.id, profile.email);

    return { profile, user };
  } catch {
    return null;
  }
}

export async function listHostVillageWorkspaces(
  auth: ApiAuthContext,
): Promise<HostVillageWorkspace[]> {
  await activatePendingHostVillageMemberships(auth.profile.id, auth.profile.email);

  try {
    const isAdmin = auth.profile.role === "admin";
    const rows = isAdmin
      ? await getDb()
          .select({
            accountEmail: hostVillageMemberships.accountEmail,
            city: villages.city,
            heroImage: villages.heroImageUrl,
            membershipId: hostVillageMemberships.id,
            region: villages.region,
            role: hostVillageMemberships.role,
            slug: villages.slug,
            status: hostVillageMemberships.status,
            summary: villages.summary,
            title: villages.name,
            villageId: villages.id,
          })
          .from(villages)
          .leftJoin(
            hostVillageMemberships,
            eq(hostVillageMemberships.villageId, villages.id),
          )
          .orderBy(desc(villages.updatedAt))
      : await getDb()
          .select({
            accountEmail: hostVillageMemberships.accountEmail,
            city: villages.city,
            heroImage: villages.heroImageUrl,
            membershipId: hostVillageMemberships.id,
            region: villages.region,
            role: hostVillageMemberships.role,
            slug: villages.slug,
            status: hostVillageMemberships.status,
            summary: villages.summary,
            title: villages.name,
            villageId: villages.id,
          })
          .from(hostVillageMemberships)
          .innerJoin(villages, eq(hostVillageMemberships.villageId, villages.id))
          .where(
            and(
              eq(hostVillageMemberships.userId, auth.user.id),
              eq(hostVillageMemberships.status, "active"),
            ),
          )
          .orderBy(desc(villages.updatedAt));

    return rows.map(mapWorkspaceRow);
  } catch {
    return [];
  }
}

export async function listManageableHostVillageWorkspaces(
  auth: ApiAuthContext,
): Promise<HostVillageWorkspace[]> {
  const workspaces = await listHostVillageWorkspaces(auth);
  if (auth.profile.role === "admin") return workspaces;

  return workspaces.filter((workspace) => canRoleManageVillage(workspace.role));
}

export async function getHostVillageAccess(
  villageSlug: string,
): Promise<HostVillageAccessResult> {
  const auth = await getCurrentHostSession();
  if (!auth) return { allowed: false, reason: "signedOut" };

  if (auth.profile.role === "admin") {
    return { allowed: true, profile: auth.profile, user: auth.user };
  }

  const allowed = await canManageHostVillage(auth, villageSlug);
  return allowed
    ? { allowed: true, profile: auth.profile, user: auth.user }
    : {
        allowed: false,
        profile: auth.profile,
        reason: "forbidden",
        user: auth.user,
      };
}

export async function canManageHostVillage(
  auth: ApiAuthContext,
  villageSlug: string,
): Promise<boolean> {
  if (auth.profile.role === "admin") return true;
  await activatePendingHostVillageMemberships(auth.profile.id, auth.profile.email);

  try {
    const [row] = await getDb()
      .select({
        id: hostVillageMemberships.id,
        role: hostVillageMemberships.role,
      })
      .from(hostVillageMemberships)
      .innerJoin(villages, eq(hostVillageMemberships.villageId, villages.id))
      .where(
        and(
          eq(villages.slug, normalizeSlug(villageSlug)),
          eq(hostVillageMemberships.userId, auth.user.id),
          eq(hostVillageMemberships.status, "active"),
        ),
      )
      .limit(1);

    return Boolean(row && canRoleManageVillage(row.role));
  } catch {
    return false;
  }
}

export async function activatePendingHostVillageMemberships(
  userId: string,
  email: string,
): Promise<void> {
  const accountEmail = normalizeEmail(email);
  if (!accountEmail) return;

  try {
    const now = new Date();
    await getDb()
      .update(hostVillageMemberships)
      .set({
        activatedAt: now,
        status: "active",
        updatedAt: now,
        userId,
      })
      .where(
        and(
          eq(hostVillageMemberships.accountEmail, accountEmail),
          eq(hostVillageMemberships.status, "pending"),
          isNull(hostVillageMemberships.userId),
        ),
      );
  } catch {
    // Older environments may not have the membership table yet.
  }
}

export async function ensureOwnerMembershipForVillage(
  villageId: string,
  auth: ApiAuthContext,
): Promise<void> {
  const accountEmail = normalizeEmail(auth.profile.email);
  if (!accountEmail) return;

  try {
    const now = new Date();
    await getDb()
      .insert(hostVillageMemberships)
      .values({
        accountEmail,
        activatedAt: now,
        role: "owner",
        status: "active",
        userId: auth.user.id,
        villageId,
      })
      .onConflictDoUpdate({
        target: [
          hostVillageMemberships.villageId,
          hostVillageMemberships.accountEmail,
        ],
        set: {
          activatedAt: now,
          role: "owner",
          status: "active",
          updatedAt: now,
          userId: auth.user.id,
        },
      });
  } catch {
    // Membership creation should not block village saving while migrations roll out.
  }
}

function mapWorkspaceRow(row: WorkspaceRow): HostVillageWorkspace {
  return {
    accountEmail: row.accountEmail ?? "",
    city: row.city,
    consolePath: `/host/villages/${encodeURIComponent(row.slug)}`,
    editorPath: `/host/villages/${encodeURIComponent(row.slug)}/editor`,
    heroImage: row.heroImage,
    membershipId: row.membershipId ?? "",
    publicPath: `/${row.slug}`,
    region: row.region,
    role: row.role ?? "viewer",
    slug: row.slug,
    status: row.status ?? "pending",
    summary: row.summary,
    title: row.title,
    villageId: row.villageId,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function canRoleManageVillage(
  role: HostVillageWorkspace["role"] | null | undefined,
): boolean {
  return role === "owner" || role === "manager" || role === "editor";
}
