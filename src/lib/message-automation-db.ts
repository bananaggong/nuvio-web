import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messageCampaigns } from "@/db/schema";
import {
  targetStatusOptions,
  type MessageCampaign,
  type MessageCampaignStatus,
  type MessageChannel,
  type MessageTargetStatus,
} from "@/lib/message-automation";

type CampaignInsert = typeof messageCampaigns.$inferInsert;
type CampaignRow = typeof messageCampaigns.$inferSelect;

export async function listMessageCampaignsFromDb(): Promise<MessageCampaign[]> {
  const rows = await getDb()
    .select()
    .from(messageCampaigns)
    .orderBy(desc(messageCampaigns.updatedAt))
    .limit(200);

  return rows.map(mapCampaignRowToMessageCampaign);
}

export async function upsertMessageCampaign(
  campaign: MessageCampaign,
): Promise<MessageCampaign> {
  const insertValue = mapMessageCampaignToInsert(campaign);
  const now = new Date();

  if (isUuid(campaign.id)) {
    const [updatedRow] = await getDb()
      .update(messageCampaigns)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(messageCampaigns.id, campaign.id))
      .returning();

    if (updatedRow) return mapCampaignRowToMessageCampaign(updatedRow);

    const [createdRow] = await getDb()
      .insert(messageCampaigns)
      .values({ ...insertValue, id: campaign.id })
      .returning();

    return mapCampaignRowToMessageCampaign(createdRow);
  }

  const [row] = await getDb()
    .insert(messageCampaigns)
    .values(insertValue)
    .returning();

  return mapCampaignRowToMessageCampaign(row);
}

export function normalizeMessageCampaign(input: unknown): MessageCampaign {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Message campaign payload is required.");
  }

  const value = input as Record<string, unknown>;

  return {
    id: asString(value.id) || `campaign-${Date.now()}`,
    name: asString(value.name) || "메시지 캠페인",
    templateId: asString(value.templateId) || "msg-accepted",
    channel: asChannel(value.channel),
    targetStatus: asTargetStatus(value.targetStatus),
    scheduledAt: asString(value.scheduledAt),
    status: asCampaignStatus(value.status),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

function mapMessageCampaignToInsert(campaign: MessageCampaign): CampaignInsert {
  return {
    name: campaign.name.trim() || "Message campaign",
    templateKey: campaign.templateId,
    channel: campaign.channel,
    targetStatus: campaign.targetStatus,
    scheduledAt: parseKoreaLocalDatetime(campaign.scheduledAt),
    status: campaign.status,
  };
}

function mapCampaignRowToMessageCampaign(row: CampaignRow): MessageCampaign {
  return {
    id: row.id,
    name: row.name,
    templateId: row.templateKey,
    channel: row.channel,
    targetStatus: asTargetStatus(row.targetStatus),
    scheduledAt: row.scheduledAt ? toKoreaDatetimeInputValue(row.scheduledAt) : "",
    status: row.status === "failed" ? "draft" : row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseKoreaLocalDatetime(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(text)) {
    return new Date(`${text}:00+09:00`);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toKoreaDatetimeInputValue(date: Date): string {
  const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return koreaTime.toISOString().slice(0, 16);
}

function asChannel(value: unknown): MessageChannel {
  const text = asString(value);
  return channelValues.includes(text as MessageChannel)
    ? (text as MessageChannel)
    : "email";
}

function asTargetStatus(value: unknown): MessageTargetStatus {
  const text = asString(value);
  return targetStatusOptions.includes(text as MessageTargetStatus)
    ? (text as MessageTargetStatus)
    : "all";
}

function asCampaignStatus(value: unknown): MessageCampaignStatus {
  const text = asString(value);
  return campaignStatusValues.includes(text as MessageCampaignStatus)
    ? (text as MessageCampaignStatus)
    : "draft";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const channelValues: MessageChannel[] = ["email", "sms", "kakao"];
const campaignStatusValues: MessageCampaignStatus[] = [
  "draft",
  "scheduled",
  "sent",
];
