import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  hostVillageMemberships,
  notificationEvents,
  profiles,
  programApplicationForms,
  programApplications,
  programs as programsTable,
} from "@/db/schema";
import { queueProgramReminderNotification as queueImmediateUserNotification } from "@/lib/notification-db";

type HostProgramRiskKind = "missingApplicationForm" | "zeroApplications";

type RiskTarget = {
  dayOffset: number;
  eventType: string;
  kind: HostProgramRiskKind;
  targetDate: string;
};

type HostProgramRiskCandidate = {
  dayOffset: number;
  eventType: string;
  href: string;
  kind: HostProgramRiskKind;
  programId: string;
  programSlug: string;
  programTitle: string;
  recruitEnd: string;
  reminderKey: string;
  targetDate: string;
  userId: string;
  villageId?: string;
};

export type HostProgramRiskNotificationProcessSummary = {
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

export async function processDueHostProgramRiskNotifications(
  options: { limit?: number } = {},
): Promise<HostProgramRiskNotificationProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
  const targets = getTodayRiskTargets();
  const candidates = await listHostProgramRiskCandidates(targets, limit);

  const summary: HostProgramRiskNotificationProcessSummary = {
    details: [],
    failed: 0,
    processed: 0,
    queued: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    summary.processed += 1;

    const alreadyQueued = await hasExistingHostProgramRiskEvent(candidate);
    if (alreadyQueued) {
      summary.skipped += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Host program risk reminder was already queued.",
        programId: candidate.programId,
        reminderKey: candidate.reminderKey,
        status: "skipped",
        userId: candidate.userId,
      });
      continue;
    }

    try {
      await queueImmediateUserNotification({
        body: buildRiskBody(candidate),
        href: candidate.href,
        metadata: {
          dayOffset: candidate.dayOffset,
          programId: candidate.programId,
          programSlug: candidate.programSlug,
          programTitle: candidate.programTitle,
          recruitEnd: candidate.recruitEnd,
          reminderKey: candidate.reminderKey,
          reminderKind: candidate.kind,
          targetDate: candidate.targetDate,
          villageId: candidate.villageId,
        },
        title: buildRiskTitle(candidate),
        type: candidate.eventType,
        userId: candidate.userId,
      });

      summary.queued += 1;
      summary.details.push({
        eventType: candidate.eventType,
        message: "Host program risk reminder queued.",
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
            : "Host program risk reminder could not be queued.",
        programId: candidate.programId,
        reminderKey: candidate.reminderKey,
        status: "failed",
        userId: candidate.userId,
      });
    }
  }

  return summary;
}

async function listHostProgramRiskCandidates(
  targets: RiskTarget[],
  limit: number,
): Promise<HostProgramRiskCandidate[]> {
  const targetsByDate = mapTargetsByDate(targets);
  const rows = await getDb()
    .select({
      createdBy: programsTable.createdBy,
      programId: programsTable.id,
      programSlug: programsTable.slug,
      programTitle: programsTable.title,
      recruitEnd: programsTable.recruitEnd,
      villageId: programsTable.villageId,
    })
    .from(programsTable)
    .where(
      and(
        inArray(programsTable.status, ["open", "upcoming"]),
        inArray(
          programsTable.recruitEnd,
          targets.map((target) => target.targetDate),
        ),
      ),
    )
    .limit(limit);

  const candidates: HostProgramRiskCandidate[] = [];

  for (const program of rows) {
    const programTargets = targetsByDate.get(String(program.recruitEnd)) ?? [];
    if (programTargets.length === 0) continue;

    const [applicationFormCount, applicationCount] = await Promise.all([
      countApplicationForms(program.programId),
      countApplications(program.programId),
    ]);
    const recipients = await listHostRecipients({
      createdBy: program.createdBy,
      villageId: program.villageId,
    });
    if (recipients.length === 0) continue;

    for (const target of programTargets) {
      if (target.kind === "missingApplicationForm" && applicationFormCount > 0) {
        continue;
      }
      if (target.kind === "zeroApplications" && applicationCount > 0) {
        continue;
      }

      for (const recipient of recipients) {
        candidates.push(
          buildCandidate({
            programId: program.programId,
            programSlug: program.programSlug,
            programTitle: program.programTitle,
            recruitEnd: String(program.recruitEnd),
            target,
            userId: recipient.id,
            villageId: program.villageId ?? undefined,
          }),
        );
      }
    }
  }

  return dedupeCandidates(candidates).slice(0, limit);
}

async function countApplicationForms(programId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(programApplicationForms)
    .where(
      and(
        eq(programApplicationForms.programId, programId),
        eq(programApplicationForms.formKind, "application"),
      ),
    );

  return row?.value ?? 0;
}

async function countApplications(programId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(programApplications)
    .where(eq(programApplications.programId, programId));

  return row?.value ?? 0;
}

async function hasExistingHostProgramRiskEvent(
  candidate: HostProgramRiskCandidate,
) {
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

function getTodayRiskTargets(): RiskTarget[] {
  return [
    buildRiskTarget({
      dayOffset: 7,
      eventType: "program.reminder.host.form_missing.d7",
      kind: "missingApplicationForm",
    }),
    buildRiskTarget({
      dayOffset: 3,
      eventType: "program.reminder.host.form_missing.d3",
      kind: "missingApplicationForm",
    }),
    buildRiskTarget({
      dayOffset: 1,
      eventType: "program.reminder.host.form_missing.d1",
      kind: "missingApplicationForm",
    }),
    buildRiskTarget({
      dayOffset: 3,
      eventType: "program.reminder.host.zero_applications.d3",
      kind: "zeroApplications",
    }),
    buildRiskTarget({
      dayOffset: 1,
      eventType: "program.reminder.host.zero_applications.d1",
      kind: "zeroApplications",
    }),
  ];
}

function buildRiskTarget(input: {
  dayOffset: number;
  eventType: string;
  kind: HostProgramRiskKind;
}): RiskTarget {
  return {
    dayOffset: input.dayOffset,
    eventType: input.eventType,
    kind: input.kind,
    targetDate: getKoreaDateString(input.dayOffset),
  };
}

function mapTargetsByDate(targets: RiskTarget[]) {
  return targets.reduce((map, target) => {
    const list = map.get(target.targetDate) ?? [];
    list.push(target);
    map.set(target.targetDate, list);
    return map;
  }, new Map<string, RiskTarget[]>());
}

function buildCandidate(input: {
  programId: string;
  programSlug: string;
  programTitle: string;
  recruitEnd: string;
  target: RiskTarget;
  userId: string;
  villageId?: string;
}): HostProgramRiskCandidate {
  const href =
    input.target.kind === "missingApplicationForm"
      ? `/host/programs/${input.programId}/forms`
      : `/host/programs/${input.programId}/applications`;

  return {
    dayOffset: input.target.dayOffset,
    eventType: input.target.eventType,
    href,
    kind: input.target.kind,
    programId: input.programId,
    programSlug: input.programSlug,
    programTitle: input.programTitle,
    recruitEnd: input.recruitEnd,
    reminderKey: buildReminderKey(input.target, input.programId),
    targetDate: input.target.targetDate,
    userId: input.userId,
    villageId: input.villageId,
  };
}

function buildRiskTitle(candidate: HostProgramRiskCandidate) {
  if (candidate.kind === "missingApplicationForm") {
    return "신청폼 연결이 필요해요";
  }

  return "모집 마감 전 신청 현황을 확인해 주세요";
}

function buildRiskBody(candidate: HostProgramRiskCandidate) {
  if (candidate.kind === "missingApplicationForm") {
    return `${candidate.programTitle} 모집 마감이 ${candidate.dayOffset}일 남았지만 아직 연결된 신청폼이 없어요. 게스트가 신청할 수 있도록 폼을 연결해 주세요.`;
  }

  return `${candidate.programTitle} 모집 마감이 ${candidate.dayOffset}일 남았고 아직 접수된 신청서가 없어요. 모집 페이지와 안내 문구를 확인해 주세요.`;
}

function getKoreaDateString(offsetDays: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + koreaOffsetMs + offsetDays * dayMs)
    .toISOString()
    .slice(0, 10);
}

function buildReminderKey(target: RiskTarget, programId: string) {
  return `${target.kind}:${target.dayOffset}:${target.targetDate}:${programId}`;
}

function dedupeCandidates(candidates: HostProgramRiskCandidate[]) {
  const seen = new Set<string>();
  const result: HostProgramRiskCandidate[] = [];

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
