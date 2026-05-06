import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostSocialConnections } from "@/db/schema";
import { protectSecret } from "@/lib/secret-box";

type HostSocialConnectionRow = typeof hostSocialConnections.$inferSelect;
type HostSocialConnectionInsert = typeof hostSocialConnections.$inferInsert;

export type HostSocialProvider = "facebook";

export type HostSocialConnection = {
  id: string;
  villageSlug: string;
  provider: HostSocialProvider;
  facebookUserId?: string;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  instagramUserId?: string;
  instagramUsername?: string;
  accessToken: string;
  tokenExpiresAt?: string;
  permissions: string[];
  status: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
  raw: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type HostSocialConnectionDraft = {
  villageSlug: string;
  provider?: HostSocialProvider;
  facebookUserId?: string;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  instagramUserId?: string;
  instagramUsername?: string;
  accessToken: string;
  tokenExpiresAt?: string | null;
  permissions?: string[];
  status?: string;
  lastSyncError?: string | null;
  raw?: Record<string, unknown>;
};

export type PublicHostSocialConnection = Omit<
  HostSocialConnection,
  "accessToken" | "pageAccessToken" | "raw"
> & {
  hasPageAccessToken: boolean;
};

export async function getHostSocialConnection(
  villageSlug: string,
  provider: HostSocialProvider = "facebook",
): Promise<HostSocialConnection | null> {
  const [row] = await getDb()
    .select()
    .from(hostSocialConnections)
    .where(
      and(
        eq(hostSocialConnections.villageSlug, normalizeSlug(villageSlug)),
        eq(hostSocialConnections.provider, provider),
      ),
    )
    .limit(1);

  return row ? mapRow(row) : null;
}

export async function upsertHostSocialConnection(
  draft: HostSocialConnectionDraft,
): Promise<HostSocialConnection> {
  const villageSlug = normalizeSlug(draft.villageSlug);
  const provider = draft.provider ?? "facebook";
  const existing = await getHostSocialConnection(villageSlug, provider);
  const now = new Date();
  const values = mapDraftToInsert({ ...draft, villageSlug, provider });

  if (existing) {
    const [row] = await getDb()
      .update(hostSocialConnections)
      .set({ ...values, updatedAt: now })
      .where(eq(hostSocialConnections.id, existing.id))
      .returning();

    return mapRow(row);
  }

  const [row] = await getDb().insert(hostSocialConnections).values(values).returning();
  return mapRow(row);
}

export async function markHostSocialConnectionSynced(
  id: string,
  result: { error?: string | null } = {},
): Promise<void> {
  await getDb()
    .update(hostSocialConnections)
    .set({
      lastSyncedAt: result.error ? undefined : new Date(),
      lastSyncError: result.error ?? null,
      status: result.error ? "error" : "connected",
      updatedAt: new Date(),
    })
    .where(eq(hostSocialConnections.id, id));
}

export function redactHostSocialConnection(
  connection: HostSocialConnection | null,
): PublicHostSocialConnection | null {
  if (!connection) return null;

  const { accessToken, pageAccessToken, raw, ...publicConnection } = connection;
  void accessToken;
  void raw;

  return {
    ...publicConnection,
    hasPageAccessToken: Boolean(pageAccessToken),
  };
}

function mapDraftToInsert(
  draft: Required<Pick<HostSocialConnectionDraft, "villageSlug" | "provider">> &
    HostSocialConnectionDraft,
): HostSocialConnectionInsert {
  return {
    villageSlug: draft.villageSlug,
    provider: draft.provider,
    facebookUserId: draft.facebookUserId?.trim() || null,
    pageId: draft.pageId?.trim() || null,
    pageName: draft.pageName?.trim() || null,
    pageAccessToken: draft.pageAccessToken
      ? protectSecret(draft.pageAccessToken)
      : null,
    instagramUserId: draft.instagramUserId?.trim() || null,
    instagramUsername: draft.instagramUsername?.trim() || null,
    accessToken: protectSecret(draft.accessToken),
    tokenExpiresAt: draft.tokenExpiresAt ? new Date(draft.tokenExpiresAt) : null,
    permissions: draft.permissions ?? [],
    status: draft.status ?? "connected",
    lastSyncError: draft.lastSyncError ?? null,
    raw: draft.raw ?? {},
  };
}

function mapRow(row: HostSocialConnectionRow): HostSocialConnection {
  return {
    id: row.id,
    villageSlug: row.villageSlug,
    provider: row.provider === "facebook" ? "facebook" : "facebook",
    facebookUserId: row.facebookUserId ?? undefined,
    pageId: row.pageId ?? undefined,
    pageName: row.pageName ?? undefined,
    pageAccessToken: row.pageAccessToken ?? undefined,
    instagramUserId: row.instagramUserId ?? undefined,
    instagramUsername: row.instagramUsername ?? undefined,
    accessToken: row.accessToken,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString(),
    permissions: row.permissions,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
    lastSyncError: row.lastSyncError ?? undefined,
    raw: row.raw,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeSlug(value: string): string {
  return (value || "boseong").trim().toLowerCase();
}
