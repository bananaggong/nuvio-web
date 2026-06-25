import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messageTemplates } from "@/db/schema";
import {
  defaultHostMessageTemplates,
  normalizeMessageTemplateTokens,
  type HostMessageTemplateCatalogItem,
} from "@/lib/message-template-catalog";

type MessageTemplateInsert = typeof messageTemplates.$inferInsert;
type MessageTemplateRow = typeof messageTemplates.$inferSelect;

export type HostMessageTemplateRecord = HostMessageTemplateCatalogItem & {
  createdAt?: string;
  persistedId?: string;
  updatedAt?: string;
};

type TemplatePayload = {
  body?: unknown;
  channel?: unknown;
  description?: unknown;
  id?: unknown;
  isDefault?: unknown;
  key?: unknown;
  name?: unknown;
  persistedId?: unknown;
  sortOrder?: unknown;
  trigger?: unknown;
};

const defaultTemplatesByKey = new Map(
  defaultHostMessageTemplates.map((template) => [template.key, template]),
);
const defaultKeysByName = new Map(
  defaultHostMessageTemplates.map((template) => [template.name, template.key]),
);

export async function listHostMessageTemplatesFromDb(options: {
  ownerId: string;
}): Promise<HostMessageTemplateRecord[]> {
  const rows = await getDb()
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.createdBy, options.ownerId),
        isNull(messageTemplates.programId),
      ),
    )
    .orderBy(asc(messageTemplates.sortOrder), asc(messageTemplates.createdAt));

  return mergeDefaultAndSavedTemplates(rows);
}

export async function upsertHostMessageTemplate(
  payload: TemplatePayload,
  options: { ownerId: string },
): Promise<HostMessageTemplateRecord> {
  const normalized = normalizeTemplatePayload(payload);
  const now = new Date();
  const insertValue: MessageTemplateInsert = {
    body: normalized.body,
    channel: normalized.channel,
    createdBy: options.ownerId,
    description: normalized.description,
    isDefault: normalized.isDefault,
    name: normalized.name,
    programId: null,
    sortOrder: normalized.sortOrder,
    templateKey: normalized.key,
    trigger: normalized.trigger,
    updatedAt: now,
  };

  const persistedId = firstUuid(payload.persistedId, payload.id);
  if (persistedId) {
    const [updatedRow] = await getDb()
      .update(messageTemplates)
      .set(insertValue)
      .where(
        and(
          eq(messageTemplates.id, persistedId),
          eq(messageTemplates.createdBy, options.ownerId),
          isNull(messageTemplates.programId),
        ),
      )
      .returning();

    if (updatedRow) return mapTemplateRowToRecord(updatedRow);
  }

  const existingRow = await findExistingTemplateRow(normalized, options.ownerId);
  if (existingRow) {
    const [updatedRow] = await getDb()
      .update(messageTemplates)
      .set(insertValue)
      .where(
        and(
          eq(messageTemplates.id, existingRow.id),
          eq(messageTemplates.createdBy, options.ownerId),
          isNull(messageTemplates.programId),
        ),
      )
      .returning();

    return mapTemplateRowToRecord(updatedRow);
  }

  const [createdRow] = await getDb()
    .insert(messageTemplates)
    .values({ ...insertValue, createdAt: now })
    .returning();

  return mapTemplateRowToRecord(createdRow);
}

export async function deleteHostMessageTemplate(
  id: string,
  options: { ownerId: string },
): Promise<{ deletedCount: number }> {
  if (!isUuid(id)) return { deletedCount: 0 };

  const [row] = await getDb()
    .select({
      id: messageTemplates.id,
      isDefault: messageTemplates.isDefault,
      templateKey: messageTemplates.templateKey,
    })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.id, id),
        eq(messageTemplates.createdBy, options.ownerId),
        isNull(messageTemplates.programId),
      ),
    )
    .limit(1);

  if (!row || row.isDefault || defaultTemplatesByKey.has(row.templateKey ?? "")) {
    return { deletedCount: 0 };
  }

  const deletedRows = await getDb()
    .delete(messageTemplates)
    .where(eq(messageTemplates.id, row.id))
    .returning({ id: messageTemplates.id });

  return { deletedCount: deletedRows.length };
}

function mergeDefaultAndSavedTemplates(
  rows: MessageTemplateRow[],
): HostMessageTemplateRecord[] {
  const consumedRowIds = new Set<string>();

  const defaults = defaultHostMessageTemplates.map((defaultTemplate) => {
    const savedRow = rows.find((row) => {
      if (consumedRowIds.has(row.id)) return false;
      return (
        row.templateKey === defaultTemplate.key ||
        (!row.templateKey && row.name === defaultTemplate.name)
      );
    });

    if (!savedRow) return defaultTemplate;

    consumedRowIds.add(savedRow.id);
    return mapTemplateRowToRecord(savedRow, defaultTemplate);
  });

  const customRows = rows
    .filter((row) => !consumedRowIds.has(row.id))
    .filter((row) => !defaultTemplatesByKey.has(row.templateKey ?? ""))
    .map((row) => mapTemplateRowToRecord(row));

  return [...defaults, ...customRows].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ko"),
  );
}

async function findExistingTemplateRow(
  template: HostMessageTemplateCatalogItem,
  ownerId: string,
): Promise<MessageTemplateRow | undefined> {
  const rows = await getDb()
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.createdBy, ownerId),
        isNull(messageTemplates.programId),
      ),
    )
    .orderBy(asc(messageTemplates.createdAt));

  return rows.find((row) => {
    if (row.templateKey === template.key) return true;
    const defaultTemplate = defaultTemplatesByKey.get(template.key);
    return Boolean(defaultTemplate && !row.templateKey && row.name === defaultTemplate.name);
  });
}

function normalizeTemplatePayload(
  payload: TemplatePayload,
): HostMessageTemplateCatalogItem {
  const rawKey = asString(payload.key);
  const rawName = asString(payload.name);
  const inferredDefaultKey =
    defaultTemplatesByKey.has(rawKey)
      ? rawKey
      : defaultKeysByName.get(rawName) ?? "";
  const fallbackDefault = defaultTemplatesByKey.get(inferredDefaultKey);
  const key =
    inferredDefaultKey ||
    normalizeCustomKey(rawKey) ||
    `custom_${Date.now().toString(36)}`;
  const isDefault = Boolean(fallbackDefault) || payload.isDefault === true;
  const description =
    asString(payload.description) ||
    asString(payload.trigger) ||
    fallbackDefault?.description ||
    "호스트가 직접 만든 메세지 템플릿입니다.";
  const name =
    rawName ||
    fallbackDefault?.name ||
    `새 템플릿 ${new Date().toLocaleDateString("ko-KR")}`;
  const body =
    normalizeMessageTemplateTokens(asString(payload.body)) ||
    fallbackDefault?.body ||
    "템플릿 메세지 내용 작성";

  return {
    body,
    channel: asChannel(payload.channel) ?? fallbackDefault?.channel ?? "sms",
    description,
    id: firstUuid(payload.persistedId, payload.id) || fallbackDefault?.id || key,
    isDefault,
    key,
    name,
    sortOrder:
      asNumber(payload.sortOrder) ?? fallbackDefault?.sortOrder ?? 1000 + Date.now() % 1000,
    trigger: asString(payload.trigger) || description,
  };
}

function mapTemplateRowToRecord(
  row: MessageTemplateRow,
  fallback?: HostMessageTemplateCatalogItem,
): HostMessageTemplateRecord {
  const key =
    row.templateKey ||
    fallback?.key ||
    defaultKeysByName.get(row.name) ||
    `custom_${row.id}`;

  return {
    body: normalizeMessageTemplateTokens(row.body),
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    description: row.description || row.trigger || fallback?.description || "",
    id: row.id,
    isDefault: row.isDefault || Boolean(fallback) || defaultTemplatesByKey.has(key),
    key,
    name: row.name || fallback?.name || "메세지 템플릿",
    persistedId: row.id,
    sortOrder: row.sortOrder || fallback?.sortOrder || 1000,
    trigger: row.trigger || row.description || fallback?.trigger || "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

function asChannel(value: unknown): "email" | "sms" | "kakao" | undefined {
  return value === "email" || value === "sms" || value === "kakao"
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstUuid(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && isUuid(value.trim())) return value.trim();
  }
  return "";
}

function normalizeCustomKey(value: string): string {
  return value && /^[a-z0-9_-]+$/iu.test(value) ? value : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
