import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  hostVillageMemberships,
  notificationEvents,
  profiles,
  programApplications,
  programs as programsTable,
} from "@/db/schema";
import { queueProgramReminderNotification as queueImmediateUserNotification } from "@/lib/notification-db";

type HostOperationReminderKind = "applicationSubmitted" | "applicationScreening";

type ReminderTarget = {
  dayOffset: number;
  eventType: string;
  kind: HostOperationReminderKind;
  targetDate: string;
  windowEnd: Date;
  windowStart: Date;
};

type HostOperationReminderCandidate = {
  applicantName: string;
  applicationId: string;
  dayOffset: number;
  eventType: string;
  href: string;
  kind: HostOperationReminderKind;
  programId: string;
  programTitle: string;
  reminderKey: string;
  targetDate: string;
  userId: string;
  villageId?: string;
};

export type HostOperationReminderProcessSummary = {
  details: Array<{
    applicationId: string;
    eventType: string;
    message: string;
    reminderKey: string;
    status: "queued" | "skipped" | "failed";
    userId: string;
  }>;
  failed: number;
  processed: number;
  queued: number;
  skipped: number;
};

export async function processDueHostOperationReminderNotifications(
  options: { limit?: number } = {},
): Promise<HostOperationReminderProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
  const targets = getTodayReminderTargets();
  const candidates = await listHostOperationReminderCandidates(targets, limit);

  const summary: HostOperationReminderProcessSummary = {
    details: [],
    failed: 0,
    processed: 0,
    queued: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    summary.processed += 1;

    const alreadyQueued = await hasExistingHostOperationReminderEvent(candidate);
    if (alreadyQueued) {
      summary.skipped += 1;
      summary.details.push({
        applicationId: candidate.applicationId,
        eventType: candidate.eventType,
        message: "Host operation reminder was already queued.",
        reminderKey: candidate.reminderKey,
        status: "skipped",
        userId: candidate.userId,
      });
      continue;
    }

    try {
      await queueImmediateUserNotification({
        body: buildReminderBody(candidate),
        href: candidate.href,
        metadata: {
          applicantName: candidate.applicantName,
          applicationId: candidate.applicationId,
          dayOffset: candidate.dayOffset,
          programId: candidate.programId,
          programTitle: candidate.programTitle,
          reminderKey: candidate.reminderKey,
          reminderKind: candidate.kind,
          targetDate: candidate.targetDate,
          villageId: candidate.villageId,
        },
        title: buildReminderTitle(candidate),
        type: candidate.eventType,
        userId: candidate.userId,
      });

      summary.queued += 1;
      summary.details.push({
        applicationId: candidate.applicationId,
        eventType: candidate.eventType,
        message: "Host operation reminder queued.",
        reminderKey: candidate.reminderKey,
        status: "queued",
        userId: candidate.userId,
      });
    } catch (error) {
      summary.failed += 1;
      summary.details.push({
        applicationId: candidate.applicationId,
        eventType: candidate.eventType,
        message:
          error instanceof Error
            ? error.message
            : "Host operation reminder could not be queued.",
        reminderKey: candidate.reminderKey,
        status: "failed",
        userId: candidate.userId,
      });
    }
  }

  return summary;
}

async function listHostOperationReminderCandidates(
  targets: ReminderTarget[],
  limit: number,
): Promise<HostOperationReminderCandidate[]> {
  const submittedTargets = targets.filter(
    (target) => target.kind === "applicationSubmitted",
  );
  const screeningTargets = targets.filter(
    (target) => target.kind === "applicationScreening",
  );
  const candidates: HostOperationReminderCandidate[] = [];

  if (submittedTargets.length > 0) {
    const rows = await getDb()
      .select({
        applicantName: programApplications.applicantName,
        applicationId: programApplications.id,
        createdBy: programsTable.createdBy,
        programId: programsTable.id,
        programTitle: programsTable.title,
        submittedAt: programApplications.submittedAt,
        villageId: programsTable.villageId,
      })
      .from(programApplications)
      .innerJoin(programsTable, eq(programApplications.programId, programsTable.id))
      .where(
        and(
          eq(programApplications.status, "submitted"),
          or(...submittedTargets.map((target) => within(target, programApplications.submittedAt))),
        ),
      )
      .limit(limit);

    for (const row of rows) {
      const target = findTargetForDate(submittedTargets, row.submittedAt);
      if (!target) continue;

      const recipients = await listHostRecipients({
        createdBy: row.createdBy,
        villageId: row.villageId,
      });

      for (const recipient of recipients) {
        candidates.push(
          buildCandidate({
            applicantName: row.applicantName,
            applicationId: row.applicationId,
            programId: row.programId,
            programTitle: row.programTitle,
            target,
            userId: recipient.id,
            villageId: row.villageId ?? undefined,
          }),
        );
      }
    }
  }

  if (screeningTargets.length > 0 && candidates.length < limit) {
    const rows = await getDb()
      .select({
        applicantName: programApplications.applicantName,
        applicationId: programApplications.id,
        createdBy: programsTable.createdBy,
        programId: programsTable.id,
        programTitle: programsTable.title,
        updatedAt: programApplications.updatedAt,
        villageId: programsTable.villageId,
      })
      .from(programApplications)
      .innerJoin(programsTable, eq(programApplications.programId, programsTable.id))
      .where(
        and(
          eq(programApplications.status, "screening"),
          or(...screeningTargets.map((target) => within(target, programApplications.updatedAt))),
        ),
      )
      .limit(limit - candidates.length);

    for (const row of rows) {
      const target = findTargetForDate(screeningTargets, row.updatedAt);
      if (!target) continue;

      const recipients = await listHostRecipients({
        createdBy: row.createdBy,
        villageId: row.villageId,
      });

      for (const recipient of recipients) {
        candidates.push(
          buildCandidate({
            applicantName: row.applicantName,
            applicationId: row.applicationId,
            programId: row.programId,
            programTitle: row.programTitle,
            target,
            userId: recipient.id,
            villageId: row.villageId ?? undefined,
          }),
        );
      }
    }
  }

  return dedupeCandidates(candidates).slice(0, limit);
}

async function hasExistingHostOperationReminderEvent(
  candidate: HostOperationReminderCandidate,
) {
  const [row] = await getDb()
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.recipientUserId, candidate.userId),
        eq(notificationEvents.eventType, candidate.eventType),
        sql`${notificationEvents.metadata}->>'applicationId' = ${candidate.applicationId}`,
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

function getTodayReminderTargets(): ReminderTarget[] {
  return [
    buildReminderTarget({
      dayOffset: 2,
      eventType: "application.review.pending.d2.host",
      kind: "applicationSubmitted",
    }),
    buildReminderTarget({
      dayOffset: 5,
      eventType: "application.review.pending.d5.host",
      kind: "applicationSubmitted",
    }),
    buildReminderTarget({
      dayOffset: 3,
      eventType: "application.review.screening.d3.host",
      kind: "applicationScreening",
    }),
  ];
}

function buildReminderTarget(input: {
  dayOffset: number;
  eventType: string;
  kind: HostOperationReminderKind;
}): ReminderTarget {
  const targetDate = getKoreaDateString(-input.dayOffset);
  const { windowEnd, windowStart } = getKoreaDayWindow(targetDate);

  return {
    dayOffset: input.dayOffset,
    eventType: input.eventType,
    kind: input.kind,
    targetDate,
    windowEnd,
    windowStart,
  };
}

function within<TColumn>(target: ReminderTarget, column: TColumn) {
  return and(gte(column as never, target.windowStart), lt(column as never, target.windowEnd));
}

function findTargetForDate(targets: ReminderTarget[], date: Date) {
  const dateText = getKoreaDateStringFromDate(date);
  return targets.find((target) => target.targetDate === dateText);
}

function buildCandidate(input: {
  applicantName: string;
  applicationId: string;
  programId: string;
  programTitle: string;
  target: ReminderTarget;
  userId: string;
  villageId?: string;
}): HostOperationReminderCandidate {
  return {
    applicantName: input.applicantName,
    applicationId: input.applicationId,
    dayOffset: input.target.dayOffset,
    eventType: input.target.eventType,
    href: `/host/programs/${encodeURIComponent(input.programId)}/applications?applicationId=${encodeURIComponent(input.applicationId)}`,
    kind: input.target.kind,
    programId: input.programId,
    programTitle: input.programTitle,
    reminderKey: buildReminderKey(input.target, input.applicationId),
    targetDate: input.target.targetDate,
    userId: input.userId,
    villageId: input.villageId,
  };
}

function buildReminderTitle(candidate: HostOperationReminderCandidate) {
  if (candidate.kind === "applicationScreening") {
    return "검토 중인 신청서가 오래 머물러 있어요";
  }

  return "검토 대기 신청서를 확인해 주세요";
}

function buildReminderBody(candidate: HostOperationReminderCandidate) {
  if (candidate.kind === "applicationScreening") {
    return `${candidate.programTitle}의 ${candidate.applicantName}님 신청서가 ${candidate.dayOffset}일째 검토 중이에요. 상태 변경이나 안내 메시지가 필요한지 확인해 주세요.`;
  }

  return `${candidate.programTitle}에 접수된 ${candidate.applicantName}님 신청서가 ${candidate.dayOffset}일째 검토 대기 중이에요.`;
}

function getKoreaDateString(offsetDays: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + koreaOffsetMs + offsetDays * dayMs)
    .toISOString()
    .slice(0, 10);
}

function getKoreaDateStringFromDate(date: Date) {
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(date.getTime() + koreaOffsetMs).toISOString().slice(0, 10);
}

function getKoreaDayWindow(dateText: string) {
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const windowStart = new Date(start.getTime() - koreaOffsetMs);
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

  return { windowEnd, windowStart };
}

function buildReminderKey(target: ReminderTarget, applicationId: string) {
  return `${target.kind}:${target.dayOffset}:${target.targetDate}:${applicationId}`;
}

function dedupeCandidates(candidates: HostOperationReminderCandidate[]) {
  const seen = new Set<string>();
  const result: HostOperationReminderCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.userId}:${candidate.eventType}:${candidate.reminderKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
