import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notificationEvents,
  notificationPreferences,
  profiles,
  userNotifications,
} from "@/db/schema";
import type { HostApplicationStatus } from "@/lib/host-operations";

export type NotificationChannel = "inApp" | "email" | "sms" | "kakao";
export type NotificationEventStatus = "pending" | "sent" | "failed" | "skipped";

export type NotificationPreference = {
  announcementEnabled: boolean;
  applicationStatusEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  kakaoEnabled: boolean;
  marketingEnabled: boolean;
  programDeadlineEnabled: boolean;
  quietHoursEnd: string;
  quietHoursStart: string;
  smsEnabled: boolean;
  updatedAt: string;
  userId: string;
};

export type UserNotification = {
  body: string;
  createdAt: string;
  href: string;
  id: string;
  metadata: Record<string, unknown>;
  readAt: string;
  title: string;
  type: string;
};

export type NotificationEventInput = {
  body: string;
  channel: NotificationChannel;
  eventType: string;
  href?: string;
  metadata?: Record<string, unknown>;
  recipient?: string;
  recipientUserId?: string;
  scheduledFor?: Date;
  title: string;
};

export type NotificationProcessSummary = {
  failed: number;
  processed: number;
  sent: number;
  skipped: number;
  details: Array<{
    channel: NotificationChannel;
    eventType: string;
    id: string;
    message: string;
    status: NotificationEventStatus;
  }>;
};

type NotificationEventRow = typeof notificationEvents.$inferSelect;

type NotificationMessage = {
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
  title: string;
  type: string;
};

export async function getNotificationPreference(
  userId: string,
): Promise<NotificationPreference> {
  const [row] = await getDb()
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (row) return mapPreference(row);

  const [created] = await getDb()
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();

  if (created) return mapPreference(created);

  const [existing] = await getDb()
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!existing) {
    throw new Error("Notification preference could not be created.");
  }

  return mapPreference(existing);
}

export async function updateNotificationPreference(
  userId: string,
  patch: Partial<
    Pick<
      NotificationPreference,
      | "announcementEnabled"
      | "applicationStatusEnabled"
      | "emailEnabled"
      | "inAppEnabled"
      | "kakaoEnabled"
      | "marketingEnabled"
      | "programDeadlineEnabled"
      | "quietHoursEnd"
      | "quietHoursStart"
      | "smsEnabled"
    >
  >,
): Promise<NotificationPreference> {
  await getNotificationPreference(userId);

  const [row] = await getDb()
    .update(notificationPreferences)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(notificationPreferences.userId, userId))
    .returning();

  return mapPreference(row);
}

export async function listUserNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<UserNotification[]> {
  const filters = [eq(userNotifications.userId, userId)];
  if (options.unreadOnly) filters.push(isNull(userNotifications.readAt));

  const rows = await getDb()
    .select()
    .from(userNotifications)
    .where(and(...filters))
    .orderBy(desc(userNotifications.createdAt))
    .limit(options.limit ?? 50);

  return rows.map(mapNotification);
}

export async function markUserNotificationsRead(
  userId: string,
  ids: string[],
): Promise<void> {
  const now = new Date();

  if (ids.length === 0) {
    await getDb()
      .update(userNotifications)
      .set({ readAt: now })
      .where(
        and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)),
      );
    return;
  }

  await getDb()
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, userId),
        inArray(userNotifications.id, ids),
      ),
    );
}

export async function createUserNotification(input: {
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
  title: string;
  type: string;
  userId: string;
}): Promise<UserNotification> {
  const [row] = await getDb()
    .insert(userNotifications)
    .values({
      body: input.body,
      href: input.href,
      metadata: input.metadata ?? {},
      title: input.title,
      type: input.type,
      userId: input.userId,
    })
    .returning();

  return mapNotification(row);
}

export async function queueNotificationEvent(
  input: NotificationEventInput,
): Promise<void> {
  await getDb().insert(notificationEvents).values({
    body: input.body,
    channel: input.channel,
    eventType: input.eventType,
    href: input.href,
    metadata: input.metadata ?? {},
    recipient: input.recipient,
    recipientUserId: input.recipientUserId,
    scheduledFor: input.scheduledFor,
    status: "pending",
    title: input.title,
  });
}

export async function processPendingNotificationEvents(
  options: { limit?: number } = {},
): Promise<NotificationProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const now = new Date();
  const rows = await getDb()
    .select()
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.status, "pending"),
        or(isNull(notificationEvents.scheduledFor), lte(notificationEvents.scheduledFor, now)),
      ),
    )
    .orderBy(asc(notificationEvents.createdAt))
    .limit(limit);

  const summary: NotificationProcessSummary = {
    details: [],
    failed: 0,
    processed: rows.length,
    sent: 0,
    skipped: 0,
  };

  for (const event of rows) {
    const detail = await processNotificationEvent(event).catch(async (error) =>
      markNotificationEvent(event, "failed", normalizeError(error)),
    );

    summary.details.push(detail);
    if (detail.status === "sent") summary.sent += 1;
    if (detail.status === "skipped") summary.skipped += 1;
    if (detail.status === "failed") summary.failed += 1;
  }

  return summary;
}

export async function queueApplicationSubmittedNotification(input: {
  applicantName?: string;
  applicationId: string;
  email: string;
  programTitle: string;
}) {
  const recipientEmail = normalizeEmail(input.email);
  const recipientUserId = await findProfileIdByEmail(recipientEmail);
  const metadata = {
    applicationId: input.applicationId,
    programTitle: input.programTitle,
  };
  const applicantMessage: NotificationMessage = {
    body: `${input.programTitle} 신청서가 접수됐어요. 운영자가 검토를 시작하면 상태가 업데이트돼요.`,
    href: "/mypage",
    metadata,
    title: "신청서가 접수됐어요",
    type: "application.submitted",
  };

  await queueNotificationEvent({
    ...applicantMessage,
    channel: "email",
    eventType: applicantMessage.type,
    recipient: recipientEmail,
    recipientUserId,
  });

  if (recipientUserId) {
    await createInAppNotificationIfEnabled(recipientUserId, applicantMessage);
  }

  await notifyHostUsersAboutSubmittedApplication({
    applicantName: input.applicantName,
    applicationId: input.applicationId,
    programTitle: input.programTitle,
  });
}

export async function queueApplicationStatusNotification(input: {
  applicationId: string;
  email: string;
  fromStatus: HostApplicationStatus;
  programTitle: string;
  status: HostApplicationStatus;
}) {
  const recipientEmail = normalizeEmail(input.email);
  const recipientUserId = await findProfileIdByEmail(recipientEmail);
  const metadata = {
    applicationId: input.applicationId,
    fromStatus: input.fromStatus,
    programTitle: input.programTitle,
    status: input.status,
  };
  const applicantMessage: NotificationMessage = {
    body: `${input.programTitle} 신청 상태가 ${statusLabels[input.status]}로 변경됐어요.`,
    href: "/mypage",
    metadata,
    title: "신청 상태가 변경됐어요",
    type: "application.statusChanged",
  };

  await queueNotificationEvent({
    ...applicantMessage,
    channel: "email",
    eventType: applicantMessage.type,
    recipient: recipientEmail,
    recipientUserId,
  });

  if (recipientUserId) {
    await createInAppNotificationIfEnabled(recipientUserId, applicantMessage);
  }
}

async function processNotificationEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  if (event.channel === "inApp") {
    return deliverInAppEvent(event);
  }

  return skipExternalEvent(event);
}

async function deliverInAppEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  const userId = event.recipientUserId ?? (await findProfileIdByEmail(event.recipient));

  if (!userId) {
    return markNotificationEvent(
      event,
      "skipped",
      "In-app notification requires a matching user.",
    );
  }

  const preference = await getNotificationPreference(userId);
  const disabledReason = getDisabledReason(preference, "inApp", event.eventType);
  if (disabledReason) {
    return markNotificationEvent(event, "skipped", disabledReason);
  }

  await createUserNotification({
    body: event.body,
    href: event.href ?? undefined,
    metadata: event.metadata,
    title: event.title,
    type: event.eventType,
    userId,
  });

  return markNotificationEvent(event, "sent", "Delivered as in-app notification.");
}

async function skipExternalEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  const userId = event.recipientUserId ?? (await findProfileIdByEmail(event.recipient));

  if (userId) {
    const preference = await getNotificationPreference(userId);
    const disabledReason = getDisabledReason(preference, event.channel, event.eventType);
    if (disabledReason) {
      return markNotificationEvent(event, "skipped", disabledReason);
    }
  }

  if (!event.recipient?.trim()) {
    return markNotificationEvent(
      event,
      "skipped",
      `${channelLabels[event.channel]} notification requires a recipient.`,
    );
  }

  return markNotificationEvent(
    event,
    "skipped",
    `${channelLabels[event.channel]} sender is not configured yet.`,
  );
}

async function markNotificationEvent(
  event: NotificationEventRow,
  status: Exclude<NotificationEventStatus, "pending">,
  message: string,
): Promise<NotificationProcessSummary["details"][number]> {
  const now = new Date();
  await getDb()
    .update(notificationEvents)
    .set({
      deliveredAt: status === "sent" || status === "skipped" ? now : undefined,
      error: message,
      status,
      updatedAt: now,
    })
    .where(eq(notificationEvents.id, event.id));

  return {
    channel: event.channel,
    eventType: event.eventType,
    id: event.id,
    message,
    status,
  };
}

async function createInAppNotificationIfEnabled(
  userId: string,
  message: NotificationMessage,
) {
  const preference = await getNotificationPreference(userId);
  const disabledReason = getDisabledReason(preference, "inApp", message.type);

  if (disabledReason) return;

  await createUserNotification({
    body: message.body,
    href: message.href,
    metadata: message.metadata,
    title: message.title,
    type: message.type,
    userId,
  });
}

async function notifyHostUsersAboutSubmittedApplication(input: {
  applicantName?: string;
  applicationId: string;
  programTitle: string;
}) {
  const recipients = await listHostNotificationRecipients();
  if (recipients.length === 0) return;

  const applicantName = input.applicantName?.trim() || "신청자";
  await Promise.all(
    recipients.map((recipient) =>
      createInAppNotificationIfEnabled(recipient.id, {
        body: `${input.programTitle}에 ${applicantName}님의 신청서가 들어왔어요.`,
        href: `/host/applications/${input.applicationId}`,
        metadata: {
          applicationId: input.applicationId,
          applicantName,
          programTitle: input.programTitle,
        },
        title: "새 신청서가 접수됐어요",
        type: "application.submitted.host",
      }),
    ),
  );
}

async function listHostNotificationRecipients(): Promise<
  Array<{ email: string; id: string }>
> {
  return getDb()
    .select({
      email: profiles.email,
      id: profiles.id,
    })
    .from(profiles)
    .where(or(eq(profiles.onboardingIntent, "host"), inArray(profiles.role, ["partner", "admin"])))
    .limit(100);
}

async function findProfileIdByEmail(email?: string | null): Promise<string | undefined> {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;

  const [row] = await getDb()
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${normalized}`)
    .limit(1);

  return row?.id;
}

function getDisabledReason(
  preference: NotificationPreference,
  channel: NotificationChannel,
  eventType: string,
): string {
  if (!isEventTypeEnabled(preference, eventType)) {
    return "Notification type is disabled by user preference.";
  }

  if (!isChannelEnabled(preference, channel)) {
    return `${channelLabels[channel]} channel is disabled by user preference.`;
  }

  return "";
}

function isEventTypeEnabled(
  preference: NotificationPreference,
  eventType: string,
): boolean {
  if (eventType.startsWith("application.")) {
    return preference.applicationStatusEnabled;
  }

  if (eventType.startsWith("announcement.")) {
    return preference.announcementEnabled;
  }

  if (eventType.startsWith("program.deadline")) {
    return preference.programDeadlineEnabled;
  }

  if (eventType.startsWith("marketing.")) {
    return preference.marketingEnabled;
  }

  return true;
}

function isChannelEnabled(
  preference: NotificationPreference,
  channel: NotificationChannel,
): boolean {
  if (channel === "email") return preference.emailEnabled;
  if (channel === "inApp") return preference.inAppEnabled;
  if (channel === "kakao") return preference.kakaoEnabled;
  if (channel === "sms") return preference.smsEnabled;

  return false;
}

function normalizeEmail(email?: string | null): string {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : "Notification delivery failed.";
}

function mapPreference(
  row: typeof notificationPreferences.$inferSelect,
): NotificationPreference {
  return {
    announcementEnabled: row.announcementEnabled,
    applicationStatusEnabled: row.applicationStatusEnabled,
    emailEnabled: row.emailEnabled,
    inAppEnabled: row.inAppEnabled,
    kakaoEnabled: row.kakaoEnabled,
    marketingEnabled: row.marketingEnabled,
    programDeadlineEnabled: row.programDeadlineEnabled,
    quietHoursEnd: row.quietHoursEnd ?? "",
    quietHoursStart: row.quietHoursStart ?? "",
    smsEnabled: row.smsEnabled,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  };
}

function mapNotification(
  row: typeof userNotifications.$inferSelect,
): UserNotification {
  return {
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    href: row.href ?? "",
    id: row.id,
    metadata: row.metadata,
    readAt: row.readAt?.toISOString() ?? "",
    title: row.title,
    type: row.type,
  };
}

const channelLabels: Record<NotificationChannel, string> = {
  email: "Email",
  inApp: "In-app",
  kakao: "Kakao",
  sms: "SMS",
};

const statusLabels: Record<HostApplicationStatus, string> = {
  accepted: "선정",
  checkedIn: "체크인",
  completed: "참여 완료",
  rejected: "미선정",
  screening: "검토중",
  submitted: "접수",
};
