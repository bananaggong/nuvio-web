import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  hostVillageMemberships,
  notificationEvents,
  profiles,
  reportProjects,
} from "@/db/schema";
import { queueProgramReminderNotification as queueImmediateUserNotification } from "@/lib/notification-db";
import {
  normalizeReportProjectModel,
  summarizeReportProject,
} from "@/lib/report-automation";

type ReportRiskTarget = {
  dayOffset: number;
  eventType: string;
  targetDate: string;
};

type HostReportRiskCandidate = {
  dayOffset: number;
  eventType: string;
  href: string;
  manualMissingCount: number;
  missingEvidenceCount: number;
  readiness: number;
  reminderKey: string;
  reportProjectId: string;
  reportTitle: string;
  targetDate: string;
  userId: string;
  villageId?: string;
};

export type HostReportRiskNotificationProcessSummary = {
  details: Array<{
    eventType: string;
    message: string;
    reminderKey: string;
    reportProjectId: string;
    status: "queued" | "skipped" | "failed";
    userId: string;
  }>;
  failed: number;
  processed: number;
  queued: number;
  skipped: number;
};

export async function processDueHostReportRiskNotifications(
  options: { limit?: number } = {},
): Promise<HostReportRiskNotificationProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
  const targets = getTodayReportRiskTargets();
  const candidates = await listHostReportRiskCandidates(targets, limit);

  const summary: HostReportRiskNotificationProcessSummary = {
    details: [],
    failed: 0,
    processed: 0,
    queued: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    summary.processed += 1;

    const alreadyQueued = await hasExistingHostReportRiskEvent(candidate);
    if (alreadyQueued) {
      summary.skipped += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Host report risk reminder was already queued.",
        reminderKey: candidate.reminderKey,
        reportProjectId: candidate.reportProjectId,
        status: "skipped",
        userId: candidate.userId,
      });
      continue;
    }

    try {
      await queueImmediateUserNotification({
        body: buildReportRiskBody(candidate),
        href: candidate.href,
        metadata: {
          dayOffset: candidate.dayOffset,
          manualMissingCount: candidate.manualMissingCount,
          missingEvidenceCount: candidate.missingEvidenceCount,
          readiness: candidate.readiness,
          reminderKey: candidate.reminderKey,
          reportProjectId: candidate.reportProjectId,
          reportTitle: candidate.reportTitle,
          targetDate: candidate.targetDate,
          villageId: candidate.villageId,
        },
        title: "운영 마감 자료를 점검해 주세요",
        type: candidate.eventType,
        userId: candidate.userId,
      });

      summary.queued += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Host report risk reminder queued.",
        reminderKey: candidate.reminderKey,
        reportProjectId: candidate.reportProjectId,
        status: "queued",
        userId: candidate.userId,
      });
    } catch (error) {
      summary.failed += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message:
          error instanceof Error
            ? error.message
            : "Host report risk reminder could not be queued.",
        reminderKey: candidate.reminderKey,
        reportProjectId: candidate.reportProjectId,
        status: "failed",
        userId: candidate.userId,
      });
    }
  }

  return summary;
}

async function listHostReportRiskCandidates(
  targets: ReportRiskTarget[],
  limit: number,
): Promise<HostReportRiskCandidate[]> {
  const targetsByDate = new Map(
    targets.map((target) => [target.targetDate, target]),
  );
  const rows = await getDb()
    .select({
      createdBy: reportProjects.createdBy,
      dueDate: reportProjects.dueDate,
      id: reportProjects.id,
      name: reportProjects.name,
      organizationName: reportProjects.organizationName,
      programId: reportProjects.programId,
      schema: reportProjects.schema,
      status: reportProjects.status,
      updatedAt: reportProjects.updatedAt,
    })
    .from(reportProjects)
    .where(
      and(
        inArray(reportProjects.status, ["draft", "collecting", "ready"]),
        inArray(
          reportProjects.dueDate,
          targets.map((target) => target.targetDate),
        ),
      ),
    )
    .limit(limit);

  const candidates: HostReportRiskCandidate[] = [];

  for (const row of rows) {
    const target = targetsByDate.get(String(row.dueDate));
    if (!target) continue;

    const payload = normalizeSchema(row.schema);
    const project = normalizeReportProjectModel({
      ...payload,
      agencyName: asString(payload.agencyName) || row.organizationName,
      id: row.id,
      programId: row.programId ?? asString(payload.programId),
      title: asString(payload.title) || row.name,
      updatedAt: row.updatedAt.toISOString(),
      villageName: asString(payload.villageName) || row.organizationName,
    });
    const reportSummary = summarizeReportProject(project);

    if (
      reportSummary.missingEvidenceCount === 0 &&
      reportSummary.manualMissingCount === 0 &&
      reportSummary.readiness >= 100
    ) {
      continue;
    }

    const recipients = await listHostRecipients({
      createdBy: row.createdBy,
      villageId: project.villageId,
    });

    for (const recipient of recipients) {
      candidates.push(
        buildCandidate({
          manualMissingCount: reportSummary.manualMissingCount,
          missingEvidenceCount: reportSummary.missingEvidenceCount,
          readiness: reportSummary.readiness,
          reportProjectId: row.id,
          reportTitle: project.title,
          target,
          userId: recipient.id,
          villageId: project.villageId,
        }),
      );
    }
  }

  return dedupeCandidates(candidates).slice(0, limit);
}

async function hasExistingHostReportRiskEvent(
  candidate: HostReportRiskCandidate,
) {
  const [row] = await getDb()
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.recipientUserId, candidate.userId),
        eq(notificationEvents.eventType, candidate.eventType),
        sql`${notificationEvents.metadata}->>'reportProjectId' = ${candidate.reportProjectId}`,
        sql`${notificationEvents.metadata}->>'reminderKey' = ${candidate.reminderKey}`,
      ),
    )
    .limit(1);

  return Boolean(row);
}

async function listHostRecipients(input: {
  createdBy?: string | null;
  villageId?: string | null;
}) {
  const recipients = new Map<string, { id: string }>();

  if (isUuid(input.createdBy ?? "")) {
    const [creator] = await getDb()
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, input.createdBy!))
      .limit(1);
    if (creator) recipients.set(creator.id, creator);
  }

  if (isUuid(input.villageId ?? "")) {
    const rows = await getDb()
      .select({ id: profiles.id })
      .from(hostVillageMemberships)
      .innerJoin(profiles, eq(hostVillageMemberships.userId, profiles.id))
      .where(
        and(
          eq(hostVillageMemberships.villageId, input.villageId!),
          eq(hostVillageMemberships.status, "active"),
          inArray(hostVillageMemberships.role, ["owner", "manager", "editor"]),
        ),
      )
      .limit(100);

    for (const row of rows) recipients.set(row.id, row);
  }

  return [...recipients.values()];
}

function getTodayReportRiskTargets(): ReportRiskTarget[] {
  return [
    buildReportRiskTarget(7, "program.reminder.host.report_due.d7"),
    buildReportRiskTarget(3, "program.reminder.host.report_due.d3"),
    buildReportRiskTarget(1, "program.reminder.host.report_due.d1"),
  ];
}

function buildReportRiskTarget(
  dayOffset: number,
  eventType: string,
): ReportRiskTarget {
  return {
    dayOffset,
    eventType,
    targetDate: getKoreaDateString(dayOffset),
  };
}

function buildCandidate(input: {
  manualMissingCount: number;
  missingEvidenceCount: number;
  readiness: number;
  reportProjectId: string;
  reportTitle: string;
  target: ReportRiskTarget;
  userId: string;
  villageId?: string;
}): HostReportRiskCandidate {
  return {
    dayOffset: input.target.dayOffset,
    eventType: input.target.eventType,
    href: `/host/projects/${input.reportProjectId}/closeout`,
    manualMissingCount: input.manualMissingCount,
    missingEvidenceCount: input.missingEvidenceCount,
    readiness: input.readiness,
    reminderKey: buildReminderKey(input.target, input.reportProjectId),
    reportProjectId: input.reportProjectId,
    reportTitle: input.reportTitle,
    targetDate: input.target.targetDate,
    userId: input.userId,
    villageId: input.villageId,
  };
}

function buildReportRiskBody(candidate: HostReportRiskCandidate) {
  const parts = [
    candidate.missingEvidenceCount > 0
      ? `미수집 증빙 ${candidate.missingEvidenceCount}개`
      : "",
    candidate.manualMissingCount > 0
      ? `필수 입력 누락 ${candidate.manualMissingCount}개`
      : "",
  ].filter(Boolean);
  const issueText =
    parts.length > 0 ? parts.join(", ") : `준비율 ${candidate.readiness}%`;

  return `${candidate.reportTitle} 마감이 ${candidate.dayOffset}일 남았어요. ${issueText}를 확인하고 제출 전 자료를 정리해 주세요.`;
}

function getKoreaDateString(offsetDays: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + koreaOffsetMs + offsetDays * dayMs)
    .toISOString()
    .slice(0, 10);
}

function buildReminderKey(target: ReportRiskTarget, reportProjectId: string) {
  return `reportDue:${target.dayOffset}:${target.targetDate}:${reportProjectId}`;
}

function dedupeCandidates(candidates: HostReportRiskCandidate[]) {
  const seen = new Set<string>();
  const result: HostReportRiskCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.userId}:${candidate.eventType}:${candidate.reminderKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

function normalizeSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
