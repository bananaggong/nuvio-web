import { NextResponse } from "next/server";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";
import {
  apiError,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  deleteHostScheduledMessages,
  listHostScheduledMessages,
  scheduleSelectedApplicationMessages,
} from "@/lib/scheduled-message-db";
import type {
  MessageCampaignStatus,
  MessageChannel,
} from "@/lib/message-automation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listHostVillageWorkspaces(auth)).map(
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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload = normalizeScheduledMessagePayload(body);
    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listHostVillageWorkspaces(auth)).map(
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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const messageIds = Array.isArray(body.messageIds)
      ? body.messageIds
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];

    if (messageIds.length === 0) {
      throw new Error("삭제할 메시지를 선택해 주세요.");
    }

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listHostVillageWorkspaces(auth)).map(
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

function normalizeScheduledMessagePayload(input: Record<string, unknown>): {
  applicationIds: string[];
  channel: MessageChannel;
  scheduledFor: string;
  status: MessageCampaignStatus;
  templateBody: string;
  templateId?: string;
} {
  const applicationIds = Array.isArray(input.applicationIds)
    ? input.applicationIds
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
  const templateBody =
    typeof input.templateBody === "string" ? input.templateBody.trim() : "";

  if (applicationIds.length === 0) {
    throw new Error("수신자를 1명 이상 선택해 주세요.");
  }
  if (!templateBody) {
    throw new Error("메시지 템플릿 본문이 필요합니다.");
  }

  return {
    applicationIds,
    channel: asChannel(input.channel),
    scheduledFor:
      typeof input.scheduledFor === "string" ? input.scheduledFor : "",
    status: asStatus(input.status),
    templateBody,
    templateId: typeof input.templateId === "string" ? input.templateId : undefined,
  };
}

function asChannel(value: unknown): MessageChannel {
  return value === "email" || value === "kakao" || value === "sms"
    ? value
    : "sms";
}

function asStatus(value: unknown): MessageCampaignStatus {
  return value === "sent" || value === "draft" || value === "scheduled"
    ? value
    : "scheduled";
}
