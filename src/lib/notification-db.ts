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
  hostVillageMemberships,
  notificationEvents,
  notificationPreferences,
  profiles,
  userNotifications,
} from "@/db/schema";
import {
  isBrowserPushConfigured,
  sendBrowserPushNotification,
} from "@/lib/browser-push";
import {
  isEmailDeliveryConfigured,
  sendEmailMessage,
} from "@/lib/email-provider";
import type { HostApplicationStatus } from "@/lib/host-operations";
import {
  deleteBrowserPushSubscriptionByEndpoint,
  listBrowserPushSubscriptions,
} from "@/lib/push-subscription-db";

export type NotificationChannel =
  | "inApp"
  | "email"
  | "sms"
  | "kakao"
  | "browserPush";
export type NotificationEventStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "skipped";

export type NotificationPreference = {
  announcementEnabled: boolean;
  applicationStatusEnabled: boolean;
  browserPushEnabled: boolean;
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
  dedupeKey?: string;
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

const notificationProcessingTimeoutMs = 30 * 60 * 1000;
const notificationRetryBaseDelayMs = 5 * 60 * 1000;
const notificationRetryMaxDelayMs = 6 * 60 * 60 * 1000;

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
      | "browserPushEnabled"
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
  dedupeKey?: string;
  href?: string;
  metadata?: Record<string, unknown>;
  title: string;
  type: string;
  userId: string;
}): Promise<UserNotification> {
  const dedupeKey = normalizeNotificationDedupeKey(input.dedupeKey);
  const [row] = await getDb()
    .insert(userNotifications)
    .values({
      body: input.body,
      dedupeKey,
      href: input.href,
      metadata: input.metadata ?? {},
      title: input.title,
      type: input.type,
      userId: input.userId,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return mapNotification(row);

  if (dedupeKey) {
    const [existing] = await getDb()
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.dedupeKey, dedupeKey))
      .limit(1);

    if (existing) return mapNotification(existing);
  }

  throw new Error("User notification could not be created.");
}

export async function queueNotificationEvent(
  input: NotificationEventInput,
): Promise<NotificationEventRow> {
  const dedupeKey = normalizeNotificationDedupeKey(input.dedupeKey);
  const [row] = await getDb()
    .insert(notificationEvents)
    .values({
      body: input.body,
      channel: input.channel,
      dedupeKey,
      eventType: input.eventType,
      href: input.href,
      metadata: input.metadata ?? {},
      recipient: input.recipient,
      recipientUserId: input.recipientUserId,
      scheduledFor: input.scheduledFor,
      status: "pending",
      title: input.title,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  if (dedupeKey) {
    const [existing] = await getDb()
      .select()
      .from(notificationEvents)
      .where(eq(notificationEvents.dedupeKey, dedupeKey))
      .limit(1);

    if (existing) return existing;
  }

  throw new Error("Notification event could not be queued.");
}

export async function processPendingNotificationEvents(
  options: { limit?: number } = {},
): Promise<NotificationProcessSummary> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const rows = await claimDueNotificationEvents(limit);
  const summary: NotificationProcessSummary = {
    details: [],
    failed: 0,
    processed: rows.length,
    sent: 0,
    skipped: 0,
  };

  for (const event of rows) {
    const detail = await processNotificationEvent(event).catch(async (error) =>
      markNotificationDeliveryFailure(event, normalizeError(error)),
    );

    summary.details.push(detail);
    if (detail.status === "sent") summary.sent += 1;
    if (detail.status === "skipped") summary.skipped += 1;
    if (detail.status === "failed") summary.failed += 1;
  }

  return summary;
}

async function claimNotificationEventForImmediateProcessing(
  event: NotificationEventRow,
): Promise<NotificationEventRow | null> {
  if (event.status !== "pending") return null;

  const now = new Date();
  const [claimed] = await getDb()
    .update(notificationEvents)
    .set({
      attemptCount: sql`${notificationEvents.attemptCount} + 1`,
      error: null,
      lastAttemptAt: now,
      nextAttemptAt: null,
      status: "processing",
      updatedAt: now,
    })
    .where(
      and(
        eq(notificationEvents.id, event.id),
        eq(notificationEvents.status, "pending"),
      ),
    )
    .returning();

  return claimed ?? null;
}

async function claimDueNotificationEvents(
  limit: number,
): Promise<NotificationEventRow[]> {
  const now = new Date();
  const staleProcessingBefore = new Date(
    now.getTime() - notificationProcessingTimeoutMs,
  );

  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('nuvio:process-notification-events'))`,
    );

    await tx
      .update(notificationEvents)
      .set({
        error: "Recovered stale notification processing claim.",
        nextAttemptAt: now,
        status: "pending",
        updatedAt: now,
      })
      .where(
        and(
          eq(notificationEvents.status, "processing"),
          lte(notificationEvents.updatedAt, staleProcessingBefore),
        ),
      );

    const dueRows = await tx
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.status, "pending"),
          or(
            isNull(notificationEvents.scheduledFor),
            lte(notificationEvents.scheduledFor, now),
          ),
          or(
            isNull(notificationEvents.nextAttemptAt),
            lte(notificationEvents.nextAttemptAt, now),
          ),
        ),
      )
      .orderBy(asc(notificationEvents.createdAt))
      .limit(limit);

    const ids = dueRows.map((row) => row.id);
    if (ids.length === 0) return [];

    return tx
      .update(notificationEvents)
      .set({
        attemptCount: sql`${notificationEvents.attemptCount} + 1`,
        error: null,
        lastAttemptAt: now,
        nextAttemptAt: null,
        status: "processing",
        updatedAt: now,
      })
      .where(inArray(notificationEvents.id, ids))
      .returning();
  });
}

export async function queueApplicationSubmittedNotification(input: {
  applicantName?: string;
  applicationId: string;
  email: string;
  programCreatedBy?: string;
  programTitle: string;
  villageId?: string;
}) {
  const recipientEmail = normalizeEmail(input.email);
  const recipientUserId = await findProfileIdByEmail(recipientEmail);
  const metadata = {
    applicationId: input.applicationId,
    programTitle: input.programTitle,
  };
  const applicantMessage: NotificationMessage = {
    body: `${input.programTitle} 신청서가 접수됐어요. 호스트가 검토를 시작하면 상태가 업데이트돼요.`,
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
    await queueBrowserPushNotification(recipientUserId, applicantMessage);
  }

  await notifyHostUsersAboutSubmittedApplicationWithPush({
    applicantName: input.applicantName,
    applicationId: input.applicationId,
    programCreatedBy: input.programCreatedBy,
    programTitle: input.programTitle,
    villageId: input.villageId,
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
    await queueBrowserPushNotification(recipientUserId, applicantMessage);
  }
}

export async function queueReviewRequestNotification(input: {
  applicationId: string;
  programId?: string | null;
  programTitle: string;
  recipientEmail: string;
  recipientName?: string | null;
  reminder?: boolean;
  requestCount?: number;
  requestId: string;
  scheduledFor?: Date;
  writeUrl?: string;
}) {
  const recipientEmail = normalizeEmail(input.recipientEmail);
  if (!recipientEmail) return;

  const recipientUserId = await findProfileIdByEmail(recipientEmail);
  const eventType = input.reminder
    ? "review.request.reminder"
    : "review.request.created";
  const recipientName = input.recipientName?.trim() || "참여자";
  const authenticatedWriteUrl = `/reviews/new?applicationId=${input.applicationId}`;
  const baseMessage: NotificationMessage = {
    body: `${recipientName}님, ${input.programTitle} 참여 경험을 후기로 남겨주세요.`,
    href: authenticatedWriteUrl,
    metadata: {
      applicationId: input.applicationId,
      programId: input.programId ?? undefined,
      programTitle: input.programTitle,
      reminder: input.reminder === true,
      requestCount: input.requestCount ?? 1,
      requestId: input.requestId,
    },
    title: input.reminder ? "후기 작성 리마인드" : "후기 작성을 부탁드려요",
    type: eventType,
  };
  const emailMessage: NotificationMessage = {
    ...baseMessage,
    href: input.writeUrl ?? authenticatedWriteUrl,
  };

  await queueNotificationEvent({
    ...emailMessage,
    channel: "email",
    dedupeKey: buildReviewRequestNotificationDedupeKey({
      channel: "email",
      eventType,
      requestCount: input.requestCount,
      requestId: input.requestId,
    }),
    eventType,
    recipient: recipientEmail,
    recipientUserId,
    scheduledFor: input.scheduledFor,
  });

  if (recipientUserId) {
    await createInAppNotificationIfEnabled(recipientUserId, baseMessage, {
      dedupeKey: buildReviewRequestNotificationDedupeKey({
        channel: "inApp",
        eventType,
        requestCount: input.requestCount,
        requestId: input.requestId,
      }),
    });
    await queueBrowserPushNotification(recipientUserId, baseMessage, {
      dedupeKey: buildReviewRequestNotificationDedupeKey({
        channel: "browserPush",
        eventType,
        requestCount: input.requestCount,
        requestId: input.requestId,
      }),
    });
  }
}

export async function queueReviewSubmittedNotification(input: {
  authorName?: string | null;
  programCreatedBy?: string | null;
  programId?: string | null;
  programTitle?: string | null;
  reviewId: string;
  reviewTitle: string;
  villageId?: string | null;
}) {
  const recipients = await listHostNotificationRecipients({
    programCreatedBy: input.programCreatedBy ?? undefined,
    villageId: input.villageId ?? undefined,
  });
  if (recipients.length === 0) return;

  const authorName = input.authorName?.trim() || "참여자";
  const programTitle = input.programTitle?.trim() || "누비오 프로그램";
  await Promise.all(
    recipients.map(async (recipient) => {
      const message: NotificationMessage = {
        body: `${authorName}님이 ${programTitle} 후기를 남겼습니다. 검토 후 공개 여부를 결정해 주세요.`,
        href: "/host/applications?panel=reviews",
        metadata: {
          authorName,
          programId: input.programId ?? undefined,
          programTitle,
          reviewId: input.reviewId,
          reviewTitle: input.reviewTitle,
          villageId: input.villageId ?? undefined,
        },
        title: "새 후기가 접수됐어요",
        type: "review.submitted.host",
      };

      await createInAppNotificationIfEnabled(recipient.id, message);
      await queueBrowserPushNotification(recipient.id, message);
    }),
  );
}

export async function queueReviewReportCreatedNotification(input: {
  programCreatedBy?: string | null;
  programId?: string | null;
  programTitle?: string | null;
  reason: string;
  reportId: string;
  reviewId: string;
  reviewTitle: string;
  villageId?: string | null;
}) {
  const recipients = await listHostNotificationRecipients({
    programCreatedBy: input.programCreatedBy ?? undefined,
    villageId: input.villageId ?? undefined,
  });
  if (recipients.length === 0) return;

  const programTitle = input.programTitle?.trim() || "누비오 프로그램";
  await Promise.all(
    recipients.map(async (recipient) => {
      const message: NotificationMessage = {
        body: `${programTitle} 후기 신고가 접수됐습니다. 신고 사유를 확인해 주세요.`,
        href: "/host/applications?panel=reviews",
        metadata: {
          programId: input.programId ?? undefined,
          programTitle,
          reason: input.reason,
          reportId: input.reportId,
          reviewId: input.reviewId,
          reviewTitle: input.reviewTitle,
          villageId: input.villageId ?? undefined,
        },
        title: "후기 신고가 접수됐어요",
        type: "review.report.created.host",
      };

      await createInAppNotificationIfEnabled(recipient.id, message);
      await queueBrowserPushNotification(recipient.id, message);
    }),
  );
}

export async function queueReviewHostReplyNotification(input: {
  authorName?: string | null;
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  replyId: string;
  reviewId: string;
  reviewTitle: string;
}) {
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const recipientUserId =
    input.recipientUserId ?? (await findProfileIdByEmail(recipientEmail));
  if (!recipientUserId && !recipientEmail) return;
  if (await hasQueuedReviewHostReplyNotification({
    recipientUserId,
    replyId: input.replyId,
  })) {
    return;
  }

  const authorName = input.authorName?.trim() || "호스트";
  const message: NotificationMessage = {
    body: `${input.reviewTitle} 후기에 ${authorName}님의 답변이 등록됐습니다.`,
    href: `/mypage/reviews`,
    metadata: {
      authorName,
      replyId: input.replyId,
      reviewId: input.reviewId,
      reviewTitle: input.reviewTitle,
    },
    title: "후기에 답변이 등록됐어요",
    type: "review.reply.created",
  };

  if (recipientEmail) {
    await queueNotificationEvent({
      ...message,
      channel: "email",
      eventType: message.type,
      recipient: recipientEmail,
      recipientUserId,
    });
  }

  if (recipientUserId) {
    await createInAppNotificationIfEnabled(recipientUserId, message);
    await queueBrowserPushNotification(recipientUserId, message);
  }
}

async function hasQueuedReviewHostReplyNotification(input: {
  recipientUserId?: string | null;
  replyId: string;
}): Promise<boolean> {
  const [event] = await getDb()
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.eventType, "review.reply.created"),
        sql`${notificationEvents.metadata}->>'replyId' = ${input.replyId}`,
      ),
    )
    .limit(1);

  if (event) return true;
  if (!input.recipientUserId) return false;

  const [notification] = await getDb()
    .select({ id: userNotifications.id })
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.userId, input.recipientUserId),
        eq(userNotifications.type, "review.reply.created"),
        sql`${userNotifications.metadata}->>'replyId' = ${input.replyId}`,
      ),
    )
    .limit(1);

  return Boolean(notification);
}

export async function queueProgramReminderNotification(input: {
  body: string;
  href: string;
  metadata?: Record<string, unknown>;
  title: string;
  type: string;
  userId: string;
}) {
  const message: NotificationMessage = {
    body: input.body,
    href: input.href,
    metadata: input.metadata,
    title: input.title,
    type: input.type,
  };

  await createInAppNotificationIfEnabled(input.userId, message);
  await queueBrowserPushNotification(input.userId, message);
}

export async function queueProgramInquiryCreatedNotification(input: {
  applicantName?: string;
  inquiryId: string;
  programCreatedBy?: string;
  programTitle: string;
  villageId?: string;
}) {
  await notifyHostUsersAboutInquiryMessage({
    applicantName: input.applicantName,
    body: `${input.programTitle}에 새 문의가 도착했어요.`,
    href: "/host/messages",
    inquiryId: input.inquiryId,
    programCreatedBy: input.programCreatedBy,
    programTitle: input.programTitle,
    title: "새 프로그램 문의가 도착했어요",
    type: "message.programInquiry.host",
    villageId: input.villageId,
  });
}

export async function queueProgramInquiryUserMessageNotification(input: {
  inquiryId: string;
  programCreatedBy?: string;
  programTitle: string;
  senderName?: string;
  villageId?: string;
}) {
  const senderName = input.senderName?.trim() || "사용자";
  await notifyHostUsersAboutInquiryMessage({
    applicantName: senderName,
    body: `${input.programTitle} 문의함에 ${senderName}님의 새 메시지가 도착했어요.`,
    href: "/host/messages",
    inquiryId: input.inquiryId,
    programCreatedBy: input.programCreatedBy,
    programTitle: input.programTitle,
    title: "새 문의 메시지가 도착했어요",
    type: "message.programInquiry.host",
    villageId: input.villageId,
  });
}

export async function queueProgramInquiryHostReplyNotification(input: {
  inquiryId: string;
  programTitle: string;
  recipientEmail?: string;
  recipientUserId?: string;
  senderName?: string;
}) {
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const recipientUserId =
    input.recipientUserId ?? (await findProfileIdByEmail(recipientEmail));
  if (!recipientUserId) return;

  const senderName = input.senderName?.trim() || "호스트";
  const message: NotificationMessage = {
    body: `${input.programTitle} 문의에 ${senderName}님의 답장이 도착했어요.`,
    href: "/mypage/messages",
    metadata: {
      inquiryId: input.inquiryId,
      programTitle: input.programTitle,
      senderName,
    },
    title: "문의 답장이 도착했어요",
    type: "message.programInquiry.user",
  };

  await createInAppNotificationIfEnabled(recipientUserId, message);
  await queueBrowserPushNotification(recipientUserId, message);
}

async function processNotificationEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  if (event.channel === "inApp") {
    return deliverInAppEvent(event);
  }

  if (event.channel === "email") {
    return deliverEmailEvent(event);
  }

  if (event.channel === "browserPush") {
    return deliverBrowserPushEvent(event);
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

async function deliverBrowserPushEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  const userId = event.recipientUserId ?? (await findProfileIdByEmail(event.recipient));

  if (!userId) {
    return markNotificationEvent(
      event,
      "skipped",
      "Browser push notification requires a matching user.",
    );
  }

  const preference = await getNotificationPreference(userId);
  const disabledReason = getDisabledReason(
    preference,
    "browserPush",
    event.eventType,
  );
  if (disabledReason) {
    return markNotificationEvent(event, "skipped", disabledReason);
  }

  const subscriptions = await listBrowserPushSubscriptions(userId);
  if (subscriptions.length === 0) {
    return markNotificationEvent(
      event,
      "skipped",
      "No browser push subscription is registered.",
    );
  }

  if (!isBrowserPushConfigured()) {
    return markNotificationEvent(
      event,
      "skipped",
      "Browser push VAPID keys are not configured.",
    );
  }

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendBrowserPushNotification(subscription, {
        body: event.body,
        href: event.href ?? undefined,
        tag: event.id,
        title: event.title,
        type: event.eventType,
      });

      if (result.status === "expired") {
        await deleteBrowserPushSubscriptionByEndpoint(subscription.endpoint);
      }

      return result;
    }),
  );

  const sentCount = results.filter((result) => result.status === "sent").length;
  if (sentCount > 0) {
    return markNotificationEvent(
      event,
      "sent",
      `Delivered to ${sentCount}/${subscriptions.length} browser subscription(s).`,
    );
  }

  const skippedCount = results.filter(
    (result) => result.status === "skipped" || result.status === "expired",
  ).length;
  const message = results[0]?.message ?? "Browser push delivery failed.";

  if (skippedCount === results.length) {
    return markNotificationEvent(event, "skipped", message);
  }

  return markNotificationDeliveryFailure(event, message);
}

async function deliverEmailEvent(
  event: NotificationEventRow,
): Promise<NotificationProcessSummary["details"][number]> {
  const recipient = await resolveEmailRecipient(event);

  if (!recipient) {
    return markNotificationEvent(
      event,
      "skipped",
      "Email notification requires a recipient.",
    );
  }

  const userId = event.recipientUserId ?? (await findProfileIdByEmail(recipient));
  if (userId) {
    const preference = await getNotificationPreference(userId);
    const disabledReason = getDisabledReason(preference, "email", event.eventType);
    if (disabledReason) {
      return markNotificationEvent(event, "skipped", disabledReason);
    }
  }

  if (!isEmailDeliveryConfigured()) {
    return markNotificationEvent(
      event,
      "failed",
      "Email delivery provider is not configured.",
    );
  }

  const result = await sendEmailMessage({
    html: renderNotificationEmailHtml(event),
    metadata: event.metadata,
    subject: event.title,
    text: renderNotificationEmailText(event),
    to: recipient,
  });

  return markNotificationEvent(
    event,
    "sent",
    "Delivered as email notification.",
    { providerMessageId: result.providerMessageId },
  );
}

async function resolveEmailRecipient(
  event: NotificationEventRow,
): Promise<string> {
  const explicitRecipient = normalizeEmail(event.recipient);
  if (explicitRecipient) return explicitRecipient;

  if (!event.recipientUserId) return "";
  return (await findProfileEmailById(event.recipientUserId)) ?? "";
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
  status: Exclude<NotificationEventStatus, "pending" | "processing">,
  message: string,
  options: { providerMessageId?: string } = {},
): Promise<NotificationProcessSummary["details"][number]> {
  const now = new Date();
  await getDb()
    .update(notificationEvents)
    .set({
      deliveredAt: status === "sent" || status === "skipped" ? now : null,
      error: message,
      href: getTerminalNotificationHref(event),
      nextAttemptAt: null,
      providerMessageId: options.providerMessageId,
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

async function markNotificationDeliveryFailure(
  event: NotificationEventRow,
  message: string,
): Promise<NotificationProcessSummary["details"][number]> {
  const now = new Date();
  const attemptCount = Math.max(event.attemptCount, 1);
  const maxAttempts = Math.max(event.maxAttempts, 1);

  if (attemptCount >= maxAttempts) {
    return markNotificationEvent(
      event,
      "failed",
      `${message} Max attempts reached (${attemptCount}/${maxAttempts}).`,
    );
  }

  const nextAttemptAt = getNextNotificationAttemptAt(attemptCount, now);
  const retryMessage = `${message} Retrying at ${nextAttemptAt.toISOString()} (${attemptCount}/${maxAttempts}).`;

  await getDb()
    .update(notificationEvents)
    .set({
      deliveredAt: null,
      error: retryMessage,
      nextAttemptAt,
      status: "pending",
      updatedAt: now,
    })
    .where(eq(notificationEvents.id, event.id));

  return {
    channel: event.channel,
    eventType: event.eventType,
    id: event.id,
    message: retryMessage,
    status: "failed",
  };
}

function getNextNotificationAttemptAt(attemptCount: number, now: Date): Date {
  const exponentialDelayMs = notificationRetryBaseDelayMs * 2 ** (attemptCount - 1);
  const cappedDelayMs = Math.min(exponentialDelayMs, notificationRetryMaxDelayMs);
  const jitterMs = Math.floor(Math.random() * notificationRetryBaseDelayMs);
  return new Date(now.getTime() + cappedDelayMs + jitterMs);
}

async function createInAppNotificationIfEnabled(
  userId: string,
  message: NotificationMessage,
  options: { dedupeKey?: string } = {},
) {
  const preference = await getNotificationPreference(userId);
  const disabledReason = getDisabledReason(preference, "inApp", message.type);

  if (disabledReason) return;

  await createUserNotification({
    body: message.body,
    dedupeKey: options.dedupeKey,
    href: message.href,
    metadata: message.metadata,
    title: message.title,
    type: message.type,
    userId,
  });
}

async function queueBrowserPushNotification(
  userId: string,
  message: NotificationMessage,
  options: { dedupeKey?: string } = {},
) {
  const event = await queueNotificationEvent({
    body: message.body,
    channel: "browserPush",
    dedupeKey: options.dedupeKey,
    eventType: message.type,
    href: message.href,
    metadata: message.metadata,
    recipientUserId: userId,
    title: message.title,
  });

  const claimedEvent = await claimNotificationEventForImmediateProcessing(event);
  if (!claimedEvent) return;
  await processNotificationEvent(claimedEvent).catch(async (error) => {
    await markNotificationDeliveryFailure(claimedEvent, normalizeError(error));
  });
}

async function notifyHostUsersAboutSubmittedApplicationWithPush(input: {
  applicantName?: string;
  applicationId: string;
  programCreatedBy?: string;
  programTitle: string;
  villageId?: string;
}) {
  const recipients = await listHostNotificationRecipients({
    programCreatedBy: input.programCreatedBy,
    villageId: input.villageId,
  });
  if (recipients.length === 0) return;

  const applicantName = input.applicantName?.trim() || "신청자";
  await Promise.all(
    recipients.map(async (recipient) => {
      const message: NotificationMessage = {
        body: `${input.programTitle}에 ${applicantName}님의 새 신청서가 들어왔어요.`,
        href: `/host/applications/${input.applicationId}`,
        metadata: {
          applicationId: input.applicationId,
          applicantName,
          programTitle: input.programTitle,
          villageId: input.villageId,
        },
        title: "새 신청서가 접수됐어요",
        type: "application.submitted.host",
      };

      await createInAppNotificationIfEnabled(recipient.id, message);
      await queueBrowserPushNotification(recipient.id, message);
    }),
  );
}

async function notifyHostUsersAboutInquiryMessage(input: {
  applicantName?: string;
  body: string;
  href: string;
  inquiryId: string;
  programCreatedBy?: string;
  programTitle: string;
  title: string;
  type: string;
  villageId?: string;
}) {
  const recipients = await listHostNotificationRecipients({
    programCreatedBy: input.programCreatedBy,
    villageId: input.villageId,
  });
  if (recipients.length === 0) return;

  const applicantName = input.applicantName?.trim() || "사용자";
  await Promise.all(
    recipients.map(async (recipient) => {
      const message: NotificationMessage = {
        body: input.body,
        href: input.href,
        metadata: {
          applicantName,
          inquiryId: input.inquiryId,
          programTitle: input.programTitle,
          villageId: input.villageId,
        },
        title: input.title,
        type: input.type,
      };

      await createInAppNotificationIfEnabled(recipient.id, message);
      await queueBrowserPushNotification(recipient.id, message);
    }),
  );
}

// Legacy fallback kept until the older mojibake notification copy is fully removed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function notifyHostUsersAboutSubmittedApplication(input: {
  applicantName?: string;
  applicationId: string;
  programCreatedBy?: string;
  programTitle: string;
  villageId?: string;
}) {
  const recipients = await listHostNotificationRecipients({
    programCreatedBy: input.programCreatedBy,
    villageId: input.villageId,
  });
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
          villageId: input.villageId,
        },
        title: "새 신청서가 접수됐어요",
        type: "application.submitted.host",
      }),
    ),
  );
}

async function listHostNotificationRecipients(options: {
  programCreatedBy?: string;
  villageId?: string;
}): Promise<
  Array<{ email: string; id: string }>
> {
  const recipients = new Map<string, { email: string; id: string }>();

  if (isUuid(options.programCreatedBy ?? "")) {
    const [creator] = await getDb()
      .select({
        email: profiles.email,
        id: profiles.id,
      })
      .from(profiles)
      .where(eq(profiles.id, options.programCreatedBy!))
      .limit(1);
    if (creator) recipients.set(creator.id, creator);
  }

  if (isUuid(options.villageId ?? "")) {
    const rows = await getDb()
      .select({
        email: profiles.email,
        id: profiles.id,
      })
      .from(hostVillageMemberships)
      .innerJoin(profiles, eq(hostVillageMemberships.userId, profiles.id))
      .where(
        and(
          eq(hostVillageMemberships.villageId, options.villageId!),
          eq(hostVillageMemberships.status, "active"),
          inArray(hostVillageMemberships.role, ["owner", "manager", "editor"]),
        ),
      )
      .limit(100);

    for (const row of rows) recipients.set(row.id, row);
  }

  if (recipients.size === 0) {
    const admins = await getDb()
      .select({
        email: profiles.email,
        id: profiles.id,
      })
      .from(profiles)
      .where(eq(profiles.role, "admin"))
      .limit(20);

    for (const admin of admins) recipients.set(admin.id, admin);
  }

  return [...recipients.values()];
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

async function findProfileEmailById(userId: string): Promise<string | undefined> {
  if (!isUuid(userId)) return undefined;

  const [row] = await getDb()
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return normalizeEmail(row?.email);
}

function getDisabledReason(
  preference: NotificationPreference,
  channel: NotificationChannel,
  eventType: string,
): string {
  if (!isEventTypeEnabled(preference, eventType)) {
    return "Notification type is disabled by user preference.";
  }

  if (channel === "email" && isTransactionalEmailEvent(eventType)) {
    return "";
  }

  if (!isChannelEnabled(preference, channel)) {
    return `${channelLabels[channel]} channel is disabled by user preference.`;
  }

  return "";
}

function buildReviewRequestNotificationDedupeKey(input: {
  channel: NotificationChannel;
  eventType: string;
  requestCount?: number;
  requestId: string;
}): string {
  const requestCount = Number.isInteger(input.requestCount)
    ? input.requestCount
    : 1;
  return [
    "review-request",
    input.channel,
    input.eventType,
    input.requestId,
    String(requestCount),
  ].join(":");
}

function normalizeNotificationDedupeKey(value?: string): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  return text.slice(0, 240);
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

  if (
    eventType.startsWith("program.deadline") ||
    eventType.startsWith("program.reminder")
  ) {
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
  if (channel === "browserPush") return preference.browserPushEnabled;
  if (channel === "email") return preference.emailEnabled;
  if (channel === "inApp") return preference.inAppEnabled;
  if (channel === "kakao") return preference.kakaoEnabled;
  if (channel === "sms") return preference.smsEnabled;

  return false;
}

function normalizeEmail(email?: string | null): string {
  return String(email ?? "").trim().toLowerCase();
}

function isTransactionalEmailEvent(eventType: string): boolean {
  return (
    eventType === "application.submitted" ||
    eventType === "application.statusChanged" ||
    eventType === "review.reply.created" ||
    eventType.startsWith("review.request.")
  );
}

function getTerminalNotificationHref(event: NotificationEventRow): string | null {
  const href = event.href?.trim();
  if (!href) return null;
  if (!event.eventType.startsWith("review.request.")) return href;

  return removeSensitiveQueryParam(href, "requestToken");
}

function removeSensitiveQueryParam(href: string, param: string): string {
  try {
    const absoluteInput = /^https?:\/\//iu.test(href);
    const url = new URL(href, "https://nuvio.local");
    url.searchParams.delete(param);

    return absoluteInput
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const pattern = new RegExp(`([?&])${escapeRegExp(param)}=[^&]*`, "giu");
    return href
      .replace(pattern, "$1")
      .replace("?&", "?")
      .replace(/[?&]$/u, "");
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function renderNotificationEmailText(event: NotificationEventRow): string {
  const lines = [event.title, "", event.body];
  const href = resolveEmailHref(event.href);
  if (href) lines.push("", href);
  return lines.join("\n");
}

function renderNotificationEmailHtml(event: NotificationEventRow): string {
  const href = resolveEmailHref(event.href);
  const actionHtml = href
    ? `<p style="margin:24px 0 0"><a href="${escapeHtmlAttribute(href)}" style="display:inline-block;border-radius:6px;background:#ff6b1a;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open Nuvio</a></p>`
    : "";

  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f7f4f0;padding:24px;font-family:Arial,sans-serif;color:#2d211b"><main style="max-width:560px;margin:0 auto;border-radius:10px;background:#ffffff;padding:28px;border:1px solid #eadfd6"><p style="margin:0 0 16px;color:#ff6b1a;font-weight:700">Nuvio</p><h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#2d211b">${escapeHtml(event.title)}</h1><p style="margin:0;font-size:15px;line-height:1.7;color:#56443a;white-space:pre-line">${escapeHtml(event.body)}</p>${actionHtml}</main></body></html>`;
}

function resolveEmailHref(href?: string | null): string {
  const value = href?.trim();
  if (!value) return "";

  try {
    const parsedUrl = new URL(value);
    return isHttpUrl(parsedUrl) ? parsedUrl.toString() : "";
  } catch {
    const baseUrl = normalizeSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL ||
        "https://nuvio.kr",
    );
    const parsedUrl = new URL(value, baseUrl);
    return isHttpUrl(parsedUrl) ? parsedUrl.toString() : "";
  }
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === "https:" || url.protocol === "http:";
}

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim() || "https://nuvio.kr";
  const withProtocol = /^https?:\/\//iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
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
    browserPushEnabled: row.browserPushEnabled,
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
  browserPush: "Browser push",
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
