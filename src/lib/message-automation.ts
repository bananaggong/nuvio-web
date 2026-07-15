import {
  applicationStatusFlow,
  applicationStatusLabels,
} from "@/lib/host-operations";
import { renderMessageTemplateTokens } from "@/lib/message-template-catalog";
import type {
  HostApplication,
  HostApplicationStatus,
  MessageTemplate,
} from "@/lib/host-operations";

export type MessageChannel = "email" | "sms" | "kakao";
export type MessageCampaignStatus = "draft" | "scheduled" | "sent";
export type MessageTargetStatus = HostApplicationStatus | "all";

export type MessageCampaign = {
  id: string;
  name: string;
  templateId: string;
  channel: MessageChannel;
  targetStatus: MessageTargetStatus;
  scheduledAt: string;
  status: MessageCampaignStatus;
  updatedAt: string;
};

export type MessageRecipientPreview = {
  applicationId: string;
  applicantName: string;
  contact: string;
  programTitle: string;
  status: HostApplicationStatus;
  body: string;
};

export const channelLabels: Record<MessageChannel, string> = {
  email: "이메일",
  sms: "문자",
  kakao: "알림톡",
};

export const campaignStatusLabels: Record<MessageCampaignStatus, string> = {
  draft: "작성 중",
  scheduled: "예약됨",
  sent: "발송 완료",
};

export const targetStatusOptions: MessageTargetStatus[] = [
  "all",
  ...applicationStatusFlow,
  "rejected",
];

export const targetStatusLabels: Record<MessageTargetStatus, string> = {
  all: "전체 신청자",
  ...applicationStatusLabels,
};

export function mergeMessageCampaigns(
  primaryCampaigns: MessageCampaign[],
  secondaryCampaigns: MessageCampaign[],
): MessageCampaign[] {
  const seen = new Set<string>();
  const mergedCampaigns: MessageCampaign[] = [];

  for (const campaign of [...primaryCampaigns, ...secondaryCampaigns]) {
    const key = campaign.id || campaign.name;
    if (seen.has(key)) continue;

    seen.add(key);
    mergedCampaigns.push(campaign);
  }

  return mergedCampaigns;
}

export function createMessageCampaign(
  templates: MessageTemplate[] = [],
): MessageCampaign {
  return {
    id: `campaign-${Date.now()}`,
    name: "새 메시지 캠페인",
    templateId: templates[0]?.id ?? "",
    channel: "sms",
    targetStatus: "all",
    scheduledAt: toLocalDatetimeInputValue(new Date()),
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function buildMessageRecipientPreview(
  campaign: MessageCampaign,
  templates: MessageTemplate[] = [],
  applications: HostApplication[] = [],
): MessageRecipientPreview[] {
  const template =
    templates.find((item) => item.id === campaign.templateId) ?? templates[0];
  if (!template) return [];

  return getCampaignRecipients(campaign, applications).map((application) => ({
    applicationId: application.id,
    applicantName: application.applicantName,
    contact: campaign.channel === "email" ? application.email : application.phone,
    programTitle: application.programTitle,
    status: application.status,
    body: renderMessageTemplate(template.body, application),
  }));
}

export function buildMessageExportCsv(
  campaign: MessageCampaign,
  templates: MessageTemplate[] = [],
  applications: HostApplication[] = [],
): string {
  const rows = buildMessageRecipientPreview(campaign, templates, applications);
  const header = [
    "캠페인",
    "채널",
    "수신자",
    "연락처",
    "프로그램",
    "상태",
    "본문",
  ];

  return [
    header,
    ...rows.map((row) => [
      campaign.name,
      channelLabels[campaign.channel],
      row.applicantName,
      row.contact,
      row.programTitle,
      applicationStatusLabels[row.status],
      row.body,
    ]),
  ]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

export function getCampaignRecipients(
  campaign: MessageCampaign,
  applications: HostApplication[] = [],
): HostApplication[] {
  if (campaign.targetStatus === "all") return applications;
  return applications.filter(
    (application) => application.status === campaign.targetStatus,
  );
}

export function renderMessageTemplate(
  body: string,
  application: HostApplication,
): string {
  return renderMessageTemplateTokens(body, {
    guestName: application.applicantName,
    programName: application.programTitle,
  });
}

function toLocalDatetimeInputValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function escapeCsvValue(value: string): string {
  if (!/[",\n]/u.test(value)) return value;
  return `"${value.replace(/"/gu, '""')}"`;
}
