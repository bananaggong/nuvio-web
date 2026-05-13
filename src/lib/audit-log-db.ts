import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { adminAuditLogs, profiles } from "@/db/schema";

export type AuditLog = {
  action: string;
  actorEmail: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, unknown>;
};

export type AuditLogInput = {
  action: string;
  actorId?: string | null;
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
};

type AuditLogFilters = {
  action?: string;
  entityType?: string;
  limit?: number;
};

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await getDb().insert(adminAuditLogs).values({
    action: input.action,
    actorId: input.actorId || null,
    entityId: input.entityId || null,
    entityType: input.entityType,
    metadata: input.metadata ?? {},
  });
}

export async function safeCreateAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await createAuditLog(input);
  } catch {
    // Audit logging should never break the primary user action.
  }
}

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLog[]> {
  const limit = clampLimit(filters.limit);
  const predicates = [];

  if (filters.action) {
    predicates.push(eq(adminAuditLogs.action, filters.action));
  }

  if (filters.entityType) {
    predicates.push(eq(adminAuditLogs.entityType, filters.entityType));
  }

  const baseQuery = getDb()
    .select({
      action: adminAuditLogs.action,
      actorEmail: profiles.email,
      actorId: adminAuditLogs.actorId,
      actorName: profiles.displayName,
      createdAt: adminAuditLogs.createdAt,
      entityId: adminAuditLogs.entityId,
      entityType: adminAuditLogs.entityType,
      id: adminAuditLogs.id,
      metadata: adminAuditLogs.metadata,
    })
    .from(adminAuditLogs)
    .leftJoin(profiles, eq(adminAuditLogs.actorId, profiles.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);

  const rows =
    predicates.length > 0
      ? await baseQuery.where(and(...predicates))
      : await baseQuery;

  return rows.map((row) => ({
    action: row.action,
    actorEmail: row.actorEmail ?? "",
    actorId: row.actorId ?? "",
    actorName: row.actorName ?? "",
    createdAt: row.createdAt.toISOString(),
    entityId: row.entityId ?? "",
    entityType: row.entityType,
    id: row.id,
    metadata: row.metadata,
  }));
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}
