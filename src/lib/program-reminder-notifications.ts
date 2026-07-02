import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notificationEvents,
  programApplications,
  programs as programsTable,
  savedPrograms,
} from "@/db/schema";
import { queueProgramReminderNotification } from "@/lib/notification-db";

export type ProgramReminderKind =
  | "recruitDeadline"
  | "activityStart";

export type ProgramReminderProcessSummary = {
  details: Array<{
    eventType: string;
    message: string;
    programId: string;
    reminderKey: string;
    status: "queued" | "skipped" | "failed";
    userId: string;
  }>;
  failed: number;
  processed: number;
  queued: number;
  skipped: number;
};

type ReminderTarget = {
  dayOffset: number;
  eventType: string;
  kind: ProgramReminderKind;
  targetDate: string;
};

type ReminderCandidate = {
  dayOffset: number;
  eventType: string;
  href: string;
  kind: ProgramReminderKind;
  programId: string;
  programSlug: string;
  programTitle: string;
  reminderKey: string;
  targetDate: string;
  title: string;
  body: string;
  userId: string;
};

export async function processDueProgramReminderNotifications(
  options: { limit?: number } = {},
): Promise<ProgramReminderProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
  const targets = getTodayReminderTargets();
  const candidates = await listProgramReminderCandidates(targets, limit);

  const summary: ProgramReminderProcessSummary = {
    details: [],
    failed: 0,
    processed: 0,
    queued: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    summary.processed += 1;

    const alreadyQueued = await hasExistingReminderEvent(candidate);
    if (alreadyQueued) {
      summary.skipped += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Program reminder was already queued.",
        programId: candidate.programId,
        reminderKey: candidate.reminderKey,
        status: "skipped",
        userId: candidate.userId,
      });
      continue;
    }

    try {
      await queueProgramReminderNotification({
        body: candidate.body,
        href: candidate.href,
        metadata: {
          dayOffset: candidate.dayOffset,
          programId: candidate.programId,
          programSlug: candidate.programSlug,
          programTitle: candidate.programTitle,
          reminderKey: candidate.reminderKey,
          reminderKind: candidate.kind,
          targetDate: candidate.targetDate,
        },
        title: candidate.title,
        type: candidate.eventType,
        userId: candidate.userId,
      });

      summary.queued += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Program reminder queued.",
        programId: candidate.programId,
        reminderKey: candidate.reminderKey,
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
            : "Program reminder could not be queued.",
        programId: candidate.programId,
        reminderKey: candidate.reminderKey,
        status: "failed",
        userId: candidate.userId,
      });
    }
  }

  return summary;
}

async function listProgramReminderCandidates(
  targets: ReminderTarget[],
  limit: number,
): Promise<ReminderCandidate[]> {
  const recruitTargets = targets.filter((target) => target.kind === "recruitDeadline");
  const startTargets = targets.filter((target) => target.kind === "activityStart");
  const candidates: ReminderCandidate[] = [];

  if (recruitTargets.length > 0) {
    const targetsByDate = mapTargetsByDate(recruitTargets);
    const rows = await getDb()
      .select({
        programId: programsTable.id,
        programSlug: programsTable.slug,
        programTitle: programsTable.title,
        recruitEnd: programsTable.recruitEnd,
        userId: savedPrograms.userId,
      })
      .from(savedPrograms)
      .innerJoin(programsTable, eq(savedPrograms.programId, programsTable.id))
      .where(
        and(
          eq(savedPrograms.alertEnabled, true),
          inArray(programsTable.status, ["open", "upcoming"]),
          inArray(
            programsTable.recruitEnd,
            recruitTargets.map((target) => target.targetDate),
          ),
        ),
      )
      .limit(limit);

    for (const row of rows) {
      const target = targetsByDate.get(String(row.recruitEnd));
      if (!target) continue;

      candidates.push({
        body:
          target.dayOffset === 1
            ? `${row.programTitle} 신청 마감이 내일이에요. 관심 있는 프로그램이라면 지금 확인해 주세요.`
            : `${row.programTitle} 신청 마감이 ${target.dayOffset}일 남았어요. 관심 있는 프로그램이라면 미리 확인해 주세요.`,
        dayOffset: target.dayOffset,
        eventType: target.eventType,
        href: `/programs/${row.programSlug}`,
        kind: target.kind,
        programId: row.programId,
        programSlug: row.programSlug,
        programTitle: row.programTitle,
        reminderKey: buildReminderKey(target, row.programId),
        targetDate: target.targetDate,
        title: "저장한 프로그램 모집 마감이 가까워요",
        userId: row.userId,
      });
    }
  }

  if (startTargets.length > 0 && candidates.length < limit) {
    const targetsByDate = mapTargetsByDate(startTargets);
    const rows = await getDb()
      .select({
        applicationId: programApplications.id,
        activityStart: programsTable.activityStart,
        programId: programsTable.id,
        programSlug: programsTable.slug,
        programTitle: programsTable.title,
        userId: programApplications.submittedBy,
      })
      .from(programApplications)
      .innerJoin(programsTable, eq(programApplications.programId, programsTable.id))
      .where(
        and(
          isNotNull(programApplications.submittedBy),
          inArray(programApplications.status, ["accepted", "checkedIn"]),
          inArray(
            programsTable.activityStart,
            startTargets.map((target) => target.targetDate),
          ),
        ),
      )
      .limit(limit - candidates.length);

    for (const row of rows) {
      const target = targetsByDate.get(String(row.activityStart));
      if (!target || !row.userId) continue;

      candidates.push({
        body:
          target.dayOffset === 1
            ? `${row.programTitle} 시작이 내일이에요. 집결지와 준비물을 한 번 더 확인해 주세요.`
            : `${row.programTitle} 시작이 ${target.dayOffset}일 남았어요. 일정과 안내사항을 미리 확인해 주세요.`,
        dayOffset: target.dayOffset,
        eventType: target.eventType,
        href: "/mypage/trips",
        kind: target.kind,
        programId: row.programId,
        programSlug: row.programSlug,
        programTitle: row.programTitle,
        reminderKey: buildReminderKey(target, row.programId),
        targetDate: target.targetDate,
        title: "예정된 여행 일정이 다가와요",
        userId: row.userId,
      });
    }
  }

  return dedupeCandidates(candidates).slice(0, limit);
}

async function hasExistingReminderEvent(candidate: ReminderCandidate) {
  const [row] = await getDb()
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.recipientUserId, candidate.userId),
        eq(notificationEvents.eventType, candidate.eventType),
        sql`${notificationEvents.metadata}->>'programId' = ${candidate.programId}`,
        sql`${notificationEvents.metadata}->>'reminderKey' = ${candidate.reminderKey}`,
      ),
    )
    .limit(1);

  return Boolean(row);
}

function getTodayReminderTargets(): ReminderTarget[] {
  return [
    {
      dayOffset: 3,
      eventType: "program.deadline.recruit.d3",
      kind: "recruitDeadline",
      targetDate: getKoreaDateString(3),
    },
    {
      dayOffset: 1,
      eventType: "program.deadline.recruit.d1",
      kind: "recruitDeadline",
      targetDate: getKoreaDateString(1),
    },
    {
      dayOffset: 7,
      eventType: "program.reminder.start.d7",
      kind: "activityStart",
      targetDate: getKoreaDateString(7),
    },
    {
      dayOffset: 1,
      eventType: "program.reminder.start.d1",
      kind: "activityStart",
      targetDate: getKoreaDateString(1),
    },
  ];
}

function getKoreaDateString(offsetDays: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + koreaOffsetMs + offsetDays * dayMs)
    .toISOString()
    .slice(0, 10);
}

function mapTargetsByDate(targets: ReminderTarget[]) {
  return targets.reduce((map, target) => {
    map.set(target.targetDate, target);
    return map;
  }, new Map<string, ReminderTarget>());
}

function buildReminderKey(target: ReminderTarget, programId: string) {
  return `${target.kind}:${target.dayOffset}:${target.targetDate}:${programId}`;
}

function dedupeCandidates(candidates: ReminderCandidate[]) {
  const seen = new Set<string>();
  const result: ReminderCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.userId}:${candidate.eventType}:${candidate.reminderKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}
