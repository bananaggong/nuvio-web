import { NextResponse } from "next/server";
import {
  listManageableHostVillageWorkspaces,
} from "@/lib/host-village-access";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  deleteHostScheduledMessages,
  listHostScheduledMessages,
  markHostScheduledMessagesSent,
  scheduleSelectedApplicationMessages,
} from "@/lib/scheduled-message-db";
import type {
  MessageCampaignStatus,
  MessageChannel,
} from "@/lib/message-automation";

export const runtime = "nodejs";

const MAX_SCHEDULED_MESSAGE_PAYLOAD_BYTES = 48 * 1024;
const MAX_SCHEDULED_MESSAGE_BODY_LENGTH = 1000;
const MAX_SCHEDULED_MESSAGE_RECIPIENTS = 100;

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-scheduled-message:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const messages = await listHostScheduledMessages({ villageIds });

    return NextResponse.json({ data: messages });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "메시지 목록을 불러오지 못했습니다.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(
    request,
    MAX_SCHEDULED_MESSAGE_PAYLOAD_BYTES,
  );
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-scheduled-message:create",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON payload.", 400);
    }
    const payload = normalizeScheduledMessagePayload(body);
    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const result = await scheduleSelectedApplicationMessages(payload, {
      villageIds,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "메시지 예약에 실패했습니다.",
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-scheduled-message:delete",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const messageIds = Array.isArray(body.messageIds)
      ? body.messageIds
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(isUuid)
      : [];

    if (messageIds.length === 0) {
      throw new Error("삭제할 메시지를 선택해 주세요.");
    }

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const deletedCount = await deleteHostScheduledMessages(messageIds, {
      villageIds,
    });

    return NextResponse.json({ data: { deletedCount } });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "메시지를 삭제하지 못했습니다.",
      400,
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 16 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-scheduled-message:mark-sent",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const payload = normalizeManualDispatchCompletionPayload(
      await request.json().catch(() => ({})),
    );
    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listManageableHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const result = await markHostScheduledMessagesSent(payload.messageIds, {
      actorEmail: auth.profile.email,
      memo: payload.memo,
      result: payload.result,
      senderPhone: payload.senderPhone,
      villageIds,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to update manual dispatch status.",
      400,
    );
  }
}

function normalizeScheduledMessagePayload(input: unknown): {
  applicationIds: string[];
  channel: MessageChannel;
  scheduledFor: string;
  status: MessageCampaignStatus;
  templateBody: string;
  templateId?: string;
} {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const applicationIds = Array.isArray(value.applicationIds)
    ? Array.from(
        new Set(
          value.applicationIds
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(isUuid),
        ),
      )
    : [];
  const templateBody =
    typeof value.templateBody === "string" ? value.templateBody.trim() : "";
  const scheduledFor =
    typeof value.scheduledFor === "string" ? value.scheduledFor.trim() : "";
  if (applicationIds.length > MAX_SCHEDULED_MESSAGE_RECIPIENTS) {
    throw new Error("Recipients exceed the maximum batch size.");
  }
  if (templateBody.length > MAX_SCHEDULED_MESSAGE_BODY_LENGTH) {
    throw new Error("Message body is too long.");
  }
  if (scheduledFor && !isValidScheduledFor(scheduledFor)) {
    throw new Error("Invalid scheduled time.");
  }

  if (applicationIds.length === 0) {
    throw new Error("수신자를 1명 이상 선택해 주세요.");
  }
  if (!templateBody) {
    throw new Error("메시지 템플릿 본문이 필요합니다.");
  }

  return {
    applicationIds,
    channel: asChannel(value.channel),
    scheduledFor,
    status: asStatus(value.status),
    templateBody,
    templateId:
      typeof value.templateId === "string" && isUuid(value.templateId)
        ? value.templateId
        : undefined,
  };
}

function normalizeManualDispatchCompletionPayload(input: unknown): {
  memo: string;
  messageIds: string[];
  result: string;
  senderPhone: string;
} {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const messageIds = Array.isArray(value.messageIds)
    ? Array.from(
        new Set(
          value.messageIds
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(isUuid),
        ),
      )
    : [];

  if (messageIds.length === 0) {
    throw new Error("No messages were selected.");
  }

  return {
    memo: asShortText(value.memo, 500),
    messageIds,
    result: asShortText(value.result, 120) || "업무폰 수동 발송",
    senderPhone: asShortText(value.senderPhone, 40),
  };
}

function asChannel(value: unknown): MessageChannel {
  if (value === "email" || value === "kakao" || value === "sms") return value;
  throw new Error("Invalid message channel.");
}

function asStatus(value: unknown): MessageCampaignStatus {
  return value === "draft" ? "draft" : "scheduled";
}

function isValidScheduledFor(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return true;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function asShortText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
