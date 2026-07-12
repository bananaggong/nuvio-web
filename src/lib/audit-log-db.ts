import { getDb } from "@/db/client";
import { adminAuditLogs } from "@/db/schema";

export type AuditLogInput = {
  action: string;
  actorId?: string | null;
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
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
