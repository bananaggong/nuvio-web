import {
  applicationStatusFlow,
  applicationStatusLabels,
  readHostApplicationsFromStorage,
  seedMessageTemplates,
} from "@/lib/host-operations";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
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
  draft: "작성중",
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

export const seedMessageCampaigns: MessageCampaign[] = [
  {
    id: "campaign-accepted",
    name: "합격자 서명 안내",
    templateId: "msg-accepted",
    channel: "email",
    targetStatus: "accepted",
    scheduledAt: "2026-05-04T14:00",
    status: "scheduled",
    updatedAt: "2026-05-04T00:00:00+09:00",
  },
  {
    id: "campaign-review",
    name: "완료자 후기 요청",
    templateId: "msg-review",
    channel: "kakao",
    targetStatus: "completed",
    scheduledAt: "2026-05-05T10:00",
    status: "draft",
    updatedAt: "2026-05-04T00:00:00+09:00",
  },
];

export function readMessageTemplates(): MessageTemplate[] {
  return seedMessageTemplates.filter((template) =>
    template.id === "msg-review" ? launchFeatureFlags.reviews : true,
  );
}

export function readMessageCampaigns(): MessageCampaign[] {
  return isDemoModeEnabled()
    ? seedMessageCampaigns.filter((campaign) =>
        campaign.templateId === "msg-review" ? launchFeatureFlags.reviews : true,
      )
    : [];
}

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
  templates = readMessageTemplates(),
): MessageCampaign {
  return {
    id: `campaign-${Date.now()}`,
    name: "새 메시지 캠페인",
    templateId: templates[0]?.id ?? "msg-accepted",
    channel: "email",
    targetStatus: "all",
    scheduledAt: toLocalDatetimeInputValue(new Date()),
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function buildMessageRecipientPreview(
  campaign: MessageCampaign,
  templates = readMessageTemplates(),
  applications = readHostApplicationsFromStorage(),
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
  templates = readMessageTemplates(),
  applications = readHostApplicationsFromStorage(),
): string {
  const rows = buildMessageRecipientPreview(campaign, templates, applications);
  const header = ["캠페인", "채널", "수신자", "연락처", "프로그램", "상태", "본문"];

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
  applications = readHostApplicationsFromStorage(),
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
  return body
    .replace(/\{name\}/gu, application.applicantName)
    .replace(/\{program\}/gu, application.programTitle);
}

function toLocalDatetimeInputValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function escapeCsvValue(value: string): string {
  if (!/[",\n]/u.test(value)) return value;
  return `"${value.replace(/"/gu, '""')}"`;
}
