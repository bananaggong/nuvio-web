import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";

export const MAX_BROWSER_PUSH_SUBSCRIPTIONS_PER_USER = 8;

export type BrowserPushSubscriptionRecord = {
  auth: string;
  createdAt: string;
  endpoint: string;
  id: string;
  p256dh: string;
  updatedAt: string;
  userAgent: string;
  userId: string;
};

export type BrowserPushSubscriptionInput = {
  auth: string;
  endpoint: string;
  p256dh: string;
  userAgent?: string;
  userId: string;
};

export async function listBrowserPushSubscriptions(
  userId: string,
): Promise<BrowserPushSubscriptionRecord[]> {
  const rows = await getDb()
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(
      desc(pushSubscriptions.updatedAt),
      desc(pushSubscriptions.createdAt),
    )
    .limit(MAX_BROWSER_PUSH_SUBSCRIPTIONS_PER_USER);

  return rows.map(mapPushSubscription);
}

export async function upsertBrowserPushSubscription(
  input: BrowserPushSubscriptionInput,
): Promise<BrowserPushSubscriptionRecord> {
  const now = new Date();
  const row = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`push-endpoint:${input.endpoint}`}))`,
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`push-subscriptions:${input.userId}`}))`,
    );

    const [existingEndpoint] = await tx
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, input.endpoint))
      .limit(1);
    if (existingEndpoint && existingEndpoint.userId !== input.userId) {
      throw new Error("This push endpoint is already registered to another account.");
    }

    const [savedRow] = await tx
      .insert(pushSubscriptions)
      .values({
        auth: input.auth,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        updatedAt: now,
        userAgent: input.userAgent,
        userId: input.userId,
      })
      .onConflictDoUpdate({
        set: {
          auth: input.auth,
          p256dh: input.p256dh,
          updatedAt: now,
          userAgent: input.userAgent,
          userId: input.userId,
        },
        target: pushSubscriptions.endpoint,
      })
      .returning();

    const retainedIds = tx
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, input.userId))
      .orderBy(
        desc(pushSubscriptions.updatedAt),
        desc(pushSubscriptions.createdAt),
      )
      .limit(MAX_BROWSER_PUSH_SUBSCRIPTIONS_PER_USER);

    await tx
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, input.userId),
          notInArray(pushSubscriptions.id, retainedIds),
        ),
      );

    return savedRow;
  });

  return mapPushSubscription(row);
}

export async function deleteBrowserPushSubscription(
  userId: string,
  endpoint: string,
): Promise<number> {
  const rows = await getDb()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    )
    .returning({ id: pushSubscriptions.id });

  return rows.length;
}

export async function deleteAllBrowserPushSubscriptions(
  userId: string,
): Promise<number> {
  const rows = await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .returning({ id: pushSubscriptions.id });

  return rows.length;
}

export async function deleteBrowserPushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

function mapPushSubscription(
  row: typeof pushSubscriptions.$inferSelect,
): BrowserPushSubscriptionRecord {
  return {
    auth: row.auth,
    createdAt: row.createdAt.toISOString(),
    endpoint: row.endpoint,
    id: row.id,
    p256dh: row.p256dh,
    updatedAt: row.updatedAt.toISOString(),
    userAgent: row.userAgent ?? "",
    userId: row.userId,
  };
}
