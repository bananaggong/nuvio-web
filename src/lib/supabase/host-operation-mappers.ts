import type {
  messageTemplates,
  programApplicationForms,
  programApplications,
  programs,
  reportProjects,
  scheduledMessages,
} from "@/db/schema";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import type { HostApplication } from "@/lib/host-operations";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  buildMessageRecipientPreview,
  type MessageCampaign,
} from "@/lib/message-automation";
import type { ReportProject } from "@/lib/report-automation";

export type ProgramInsert = typeof programs.$inferInsert;
export type ProgramApplicationFormInsert =
  typeof programApplicationForms.$inferInsert;
export type ProgramApplicationInsert = typeof programApplications.$inferInsert;
export type MessageTemplateInsert = typeof messageTemplates.$inferInsert;
export type ScheduledMessageInsert = typeof scheduledMessages.$inferInsert;
export type ReportProjectInsert = typeof reportProjects.$inferInsert;

export function mapProgramDraftToProgramInsert(
  draft: HostProgramDraft,
): ProgramInsert {
  return {
    title: draft.title,
    slug: createSlug(draft.title, draft.id),
    region: draft.region,
    city: draft.city,
    summary: draft.summary,
    description: draft.description,
    theme: draft.theme,
    categories: [draft.theme],
    hashtags: draft.hashtags,
    periodKey: draft.periodKey,
    activityStart: draft.activityStart,
    activityEnd: draft.activityEnd,
    recruitStart: draft.recruitStart,
    recruitEnd: draft.recruitEnd,
    target: draft.target,
    capacity: draft.capacity,
    announcement: `${draft.recruitEnd} 모집 마감`,
    subsidyLabel: draft.subsidyLabel,
    subsidyAmount: draft.subsidyAmount,
    fee: draft.fee,
    applicants: 0,
    status: draft.status,
    sourceName: draft.sourceName,
    sourceUrl: draft.sourceUrl,
    applyUrl: draft.applyUrl,
    phone: draft.phone,
    imageUrl: draft.image,
    gallery: [draft.image],
    badges: draft.hashtags.slice(0, 4),
    body: [draft.description],
    publishedAt: draft.published ? new Date() : undefined,
  };
}

export function mapApplicationFormTemplateToInsert(
  template: ApplicationFormTemplate,
  programId?: string,
): ProgramApplicationFormInsert {
  return {
    programId,
    title: template.name,
    description: template.description,
    fields: template.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      helper: field.helper,
      options: field.options ?? [],
    })),
  };
}

export function mapHostApplicationToInsert(
  application: HostApplication,
  params: { programId: string; formId?: string },
): ProgramApplicationInsert {
  return {
    programId: params.programId,
    formId: params.formId,
    applicantName: application.applicantName,
    email: application.email,
    phone: application.phone,
    status: application.status,
    answers: {
      memo: application.memo,
      importedProgramTitle: application.programTitle,
    },
    paymentAmount: application.paymentAmount,
    receiptCount: application.receiptCount,
    signatureCompleted: application.signatureCompleted,
    reviewSubmitted: application.reviewSubmitted,
    submittedAt: new Date(application.submittedAt),
  };
}

export function mapMessageCampaignToScheduledMessageInserts(
  campaign: MessageCampaign,
  params: {
    templateId?: string;
    applicationIdByLocalId?: Record<string, string>;
    applications: HostApplication[];
  },
): ScheduledMessageInsert[] {
  return buildMessageRecipientPreview(campaign, undefined, params.applications).map(
    (recipient) => ({
      templateId: params.templateId,
      applicationId: params.applicationIdByLocalId?.[recipient.applicationId],
      channel: campaign.channel,
      recipient: recipient.contact,
      body: recipient.body,
      deliveryStatus: campaign.status,
      scheduledFor: campaign.scheduledAt
        ? new Date(campaign.scheduledAt)
        : undefined,
      sentAt: campaign.status === "sent" ? new Date() : undefined,
    }),
  );
}

export function mapReportProjectToInsert(
  project: ReportProject,
  programId?: string,
): ReportProjectInsert {
  return {
    programId,
    name: project.title,
    organizationName: project.villageName || project.agencyName,
    reportType: "operation-closeout",
    status: project.status === "review" ? "collecting" : project.status,
    schema: {
      activityEvents: project.activityEvents,
      agencyName: project.agencyName,
      budgetCategories: project.budgetCategories,
      connectedProgramTitles: project.connectedProgramTitles,
      evidenceRules: project.evidenceRules,
      expenseEvents: project.expenseEvents,
      imageUrl: project.imageUrl,
      manualFields: project.manualFields,
      ownerName: project.ownerName,
      periodLabel: project.periodLabel,
      programTitle: project.programTitle,
      sections: project.sections,
      title: project.title,
      villageName: project.villageName,
    },
  };
}

function createSlug(title: string, fallback: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/gu, "");

  return normalized || fallback;
}
