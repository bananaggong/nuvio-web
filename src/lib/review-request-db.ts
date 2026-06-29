import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplications,
  programs as programsTable,
  reviewRequests,
  reviews as reviewsTable,
  villages,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type { ReviewStatus } from "@/lib/types";

export type ReviewRequestStatus =
  | "pending"
  | "sent"
  | "opened"
  | "completed"
  | "cancelled"
  | "expired";

export type ReviewRequestRecord = {
  id: string;
  applicationId: string;
  applicationStatus: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  expiresAt?: string;
  lastRequestedAt?: string;
  nextReminderAt?: string;
  programId: string;
  programLegacyId?: number;
  programRunId?: string;
  programSlug?: string;
  programTitle: string;
  recipientEmail: string;
  recipientName: string;
  requestCount: number;
  review?: {
    id: string;
    status: ReviewStatus;
  };
  status: ReviewRequestStatus;
  updatedAt: string;
  villageSlug?: string;
  writeUrl?: string;
};

type ReviewRequestInsert = typeof reviewRequests.$inferInsert;
type ReviewRequestContext = {
  applicantName: string;
  applicationId: string;
  applicationStatus: string;
  email: string;
  programId: string;
  programLegacyId: number | null;
  programRunId: string | null;
  programSlug: string | null;
  programTitle: string | null;
  programVillageId: string | null;
  reviewId: string | null;
  reviewStatus: ReviewStatus | null;
  villageSlug: string | null;
};

type ListHostReviewRequestOptions = {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  limit?: number;
  status?: ReviewRequestStatus;
};

type ReviewRequestAccessOptions = {
  actorId?: string;
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
};

const eligibleApplicationStatuses = new Set(["accepted", "checkedIn", "completed"]);
const activeReviewRequestStatuses: ReviewRequestStatus[] = ["pending", "sent", "opened"];
const reviewRequestStatuses: ReviewRequestStatus[] = [
  "pending",
  "sent",
  "opened",
  "completed",
  "cancelled",
  "expired",
];
const requestCooldownMs = 24 * 60 * 60 * 1000;
const defaultReminderDelayMs = 7 * 24 * 60 * 60 * 1000;
const defaultExpiryMs = 60 * 24 * 60 * 60 * 1000;

export class ReviewRequestAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review request.");
    this.name = "ReviewRequestAccessError";
  }
}

export class ReviewRequestEligibilityError extends Error {
  constructor(message = "This application is not eligible for a review request yet.") {
    super(message);
    this.name = "ReviewRequestEligibilityError";
  }
}

export class ReviewRequestCooldownError extends Error {
  constructor(message = "This review request was sent too recently.") {
    super(message);
    this.name = "ReviewRequestCooldownError";
  }
}

export async function listHostReviewRequestsFromDb(
  options: ListHostReviewRequestOptions = {},
): Promise<ReviewRequestRecord[]> {
  await expireStaleReviewRequests();

  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) return [];
  if (options.allowedVillageSlugs && options.allowedVillageSlugs.length === 0) return [];

  const conditions = buildReviewRequestAccessConditions(options);
  if (options.status) conditions.push(eq(reviewRequests.status, options.status));

  const rows = await selectReviewRequests(conditions, clampLimit(options.limit, 200));
  return rows.map(mapReviewRequestRow);
}

export async function listMyReviewRequestsFromDb(
  auth: ApiAuthContext,
  options: { includeCompleted?: boolean; limit?: number } = {},
): Promise<ReviewRequestRecord[]> {
  await expireStaleReviewRequests();

  const ownerPredicate = buildApplicationOwnerPredicate(auth);
  if (!ownerPredicate) return [];

  const conditions: SQL[] = [ownerPredicate];
  if (!options.includeCompleted) {
    conditions.push(inArray(reviewRequests.status, activeReviewRequestStatuses));
  }

  const rows = await selectReviewRequests(conditions, clampLimit(options.limit, 100));
  return rows.map(mapReviewRequestRow);
}

export async function requestHostReviewForApplication(
  input: unknown,
  options: ReviewRequestAccessOptions = {},
): Promise<ReviewRequestRecord> {
  const normalized = normalizeCreateReviewRequestInput(input);
  const context = await getReviewRequestContext(normalized.applicationId);
  if (!context) throw new ReviewRequestEligibilityError("Application was not found.");

  assertReviewRequestAccess(context, options);

  if (!eligibleApplicationStatuses.has(context.applicationStatus) && !context.reviewId) {
    throw new ReviewRequestEligibilityError();
  }

  const now = new Date();
  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`review-request:${context.applicationId}`}))`,
    );

    const [existing] = await tx
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.applicationId, context.applicationId))
      .limit(1);

    if (existing) {
      if (context.reviewId || existing.status === "completed") {
        const [updatedCompleted] = await tx
          .update(reviewRequests)
          .set({
            completedAt: existing.completedAt ?? now,
            reviewId: context.reviewId ?? existing.reviewId,
            status: "completed",
            updatedAt: now,
          })
          .where(eq(reviewRequests.id, existing.id))
          .returning();
        return [updatedCompleted];
      }

      if (!normalized.force && isWithinCooldown(existing.lastRequestedAt, now)) {
        throw new ReviewRequestCooldownError();
      }

      const [updated] = await tx
        .update(reviewRequests)
        .set({
          cancelledAt: null,
          completedAt: null,
          expiresAt: new Date(now.getTime() + defaultExpiryMs),
          lastRequestedAt: now,
          nextReminderAt: new Date(now.getTime() + defaultReminderDelayMs),
          requestCount: sql`${reviewRequests.requestCount} + 1`,
          reviewId: null,
          status: "pending",
          updatedAt: now,
        })
        .where(eq(reviewRequests.id, existing.id))
        .returning();
      return [updated];
    }

    const insertValue: ReviewRequestInsert = {
      applicationId: context.applicationId,
      completedAt: context.reviewId ? now : null,
      createdBy: options.actorId ?? null,
      expiresAt: new Date(now.getTime() + defaultExpiryMs),
      lastRequestedAt: now,
      nextReminderAt: context.reviewId ? null : new Date(now.getTime() + defaultReminderDelayMs),
      programId: context.programId,
      programRunId: context.programRunId,
      recipientEmail: context.email.trim().toLowerCase(),
      recipientName: context.applicantName.trim() || "Participant",
      requestCount: context.reviewId ? 0 : 1,
      reviewId: context.reviewId,
      status: context.reviewId ? "completed" : "pending",
      villageSlug: context.villageSlug,
    };

    const [created] = await tx.insert(reviewRequests).values(insertValue).returning();
    return [created];
  });

  void safeCreateAuditLog({
    action: "review.request.upsert",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review_request",
    metadata: {
      applicationId: row.applicationId,
      requestCount: row.requestCount,
      status: row.status,
    },
  });

  return hydrateReviewRequest(row.id);
}

export async function updateHostReviewRequestStatus(
  input: unknown,
  options: ReviewRequestAccessOptions = {},
): Promise<ReviewRequestRecord> {
  const normalized = normalizeUpdateReviewRequestInput(input);

  const [existing] = await getDb()
    .select({ request: reviewRequests, programVillageId: programsTable.villageId })
    .from(reviewRequests)
    .leftJoin(programsTable, eq(reviewRequests.programId, programsTable.id))
    .where(eq(reviewRequests.id, normalized.id))
    .limit(1);

  if (!existing) throw new ReviewRequestEligibilityError("Review request was not found.");
  assertReviewRequestAccess(
    {
      applicationId: existing.request.applicationId,
      applicationStatus: "completed",
      applicantName: existing.request.recipientName,
      email: existing.request.recipientEmail,
      programId: existing.request.programId ?? "",
      programLegacyId: null,
      programRunId: existing.request.programRunId,
      programSlug: null,
      programTitle: null,
      programVillageId: existing.programVillageId,
      reviewId: existing.request.reviewId,
      reviewStatus: null,
      villageSlug: existing.request.villageSlug,
    },
    options,
  );

  const nextStatus = normalized.status;
  const now = new Date();
  if (existing.request.status === "completed" && nextStatus !== "completed") {
    throw new ReviewRequestEligibilityError("Completed review requests cannot be reopened.");
  }

  const [row] = await getDb()
    .update(reviewRequests)
    .set({
      cancelledAt: nextStatus === "cancelled" ? now : null,
      completedAt: nextStatus === "completed" ? existing.request.completedAt ?? now : null,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(reviewRequests.id, normalized.id))
    .returning();

  void safeCreateAuditLog({
    action: "review.request.status.update",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review_request",
    metadata: {
      fromStatus: existing.request.status,
      status: row.status,
    },
  });

  return hydrateReviewRequest(row.id);
}

export async function markReviewRequestCompletedForApplication(
  applicationId: string,
  reviewId: string,
): Promise<void> {
  if (!isUuid(applicationId) || !isUuid(reviewId)) return;

  await getDb()
    .update(reviewRequests)
    .set({
      completedAt: new Date(),
      reviewId,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(reviewRequests.applicationId, applicationId));
}

export async function reopenReviewRequestForApplication(applicationId: string): Promise<void> {
  if (!isUuid(applicationId)) return;

  await getDb()
    .update(reviewRequests)
    .set({
      completedAt: null,
      reviewId: null,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(and(eq(reviewRequests.applicationId, applicationId), eq(reviewRequests.status, "completed")));
}

async function expireStaleReviewRequests(): Promise<void> {
  await getDb()
    .update(reviewRequests)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        inArray(reviewRequests.status, activeReviewRequestStatuses),
        sql`${reviewRequests.expiresAt} is not null`,
        sql`${reviewRequests.expiresAt} < now()`,
      ),
    );
}

async function hydrateReviewRequest(id: string): Promise<ReviewRequestRecord> {
  const rows = await selectReviewRequests([eq(reviewRequests.id, id)], 1);
  const row = rows[0];
  if (!row) throw new ReviewRequestEligibilityError("Review request was not found.");
  return mapReviewRequestRow(row);
}

async function selectReviewRequests(conditions: SQL[], limit: number) {
  const baseQuery = getDb()
    .select({
      applicationStatus: programApplications.status,
      programLegacyId: programsTable.legacyId,
      programSlug: programsTable.slug,
      programTitle: programsTable.title,
      request: reviewRequests,
      reviewId: reviewsTable.id,
      reviewStatus: reviewsTable.status,
    })
    .from(reviewRequests)
    .innerJoin(programApplications, eq(reviewRequests.applicationId, programApplications.id))
    .leftJoin(programsTable, eq(reviewRequests.programId, programsTable.id))
    .leftJoin(reviewsTable, eq(reviewRequests.reviewId, reviewsTable.id));

  return conditions.length > 0
    ? baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(reviewRequests.updatedAt))
        .limit(limit)
    : baseQuery.orderBy(desc(reviewRequests.updatedAt)).limit(limit);
}

async function getReviewRequestContext(applicationId: string): Promise<ReviewRequestContext | null> {
  if (!isUuid(applicationId)) return null;

  const [row] = await getDb()
    .select({
      applicantName: programApplications.applicantName,
      applicationId: programApplications.id,
      applicationStatus: programApplications.status,
      email: programApplications.email,
      programId: programApplications.programId,
      programLegacyId: programsTable.legacyId,
      programRunId: programApplications.programRunId,
      programSlug: programsTable.slug,
      programTitle: programsTable.title,
      programVillageId: programsTable.villageId,
      reviewId: reviewsTable.id,
      reviewStatus: reviewsTable.status,
      villageSlug: villages.slug,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .leftJoin(reviewsTable, eq(reviewsTable.applicationId, programApplications.id))
    .where(eq(programApplications.id, applicationId))
    .limit(1);

  return row ?? null;
}

function mapReviewRequestRow(row: Awaited<ReturnType<typeof selectReviewRequests>>[number]): ReviewRequestRecord {
  const request = row.request;
  const active = activeReviewRequestStatuses.includes(asReviewRequestStatus(request.status));
  const hasReview = Boolean(request.reviewId || row.reviewId);

  return {
    id: request.id,
    applicationId: request.applicationId,
    applicationStatus: row.applicationStatus,
    cancelledAt: request.cancelledAt?.toISOString(),
    completedAt: request.completedAt?.toISOString(),
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt?.toISOString(),
    lastRequestedAt: request.lastRequestedAt?.toISOString(),
    nextReminderAt: request.nextReminderAt?.toISOString(),
    programId: request.programId ?? "",
    programLegacyId: row.programLegacyId ?? undefined,
    programRunId: request.programRunId ?? undefined,
    programSlug: row.programSlug ?? undefined,
    programTitle: row.programTitle ?? "",
    recipientEmail: request.recipientEmail,
    recipientName: request.recipientName,
    requestCount: request.requestCount,
    review: request.reviewId || row.reviewId
      ? {
          id: request.reviewId ?? row.reviewId ?? "",
          status: row.reviewStatus ?? "pending",
        }
      : undefined,
    status: asReviewRequestStatus(request.status),
    updatedAt: request.updatedAt.toISOString(),
    villageSlug: request.villageSlug ?? undefined,
    writeUrl: active && !hasReview ? `/reviews/new?applicationId=${request.applicationId}` : undefined,
  };
}

function buildReviewRequestAccessConditions(options: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
}): SQL[] {
  const accessConditions: SQL[] = [];

  if (options.allowedVillageSlugs) {
    accessConditions.push(inArray(reviewRequests.villageSlug, options.allowedVillageSlugs));
  }
  if (options.allowedVillageIds) {
    accessConditions.push(inArray(programsTable.villageId, options.allowedVillageIds));
  }

  if (accessConditions.length === 0) return [];
  if (accessConditions.length === 1) return [accessConditions[0]];

  const accessPredicate = or(...accessConditions);
  return accessPredicate ? [accessPredicate] : [];
}

function assertReviewRequestAccess(
  context: ReviewRequestContext,
  options: ReviewRequestAccessOptions,
) {
  if (!options.allowedVillageIds && !options.allowedVillageSlugs) return;
  if (context.villageSlug && options.allowedVillageSlugs?.includes(context.villageSlug)) return;
  if (context.programVillageId && options.allowedVillageIds?.includes(context.programVillageId)) return;
  throw new ReviewRequestAccessError();
}

function buildApplicationOwnerPredicate(auth: ApiAuthContext): SQL | undefined {
  const ownerConditions: SQL[] = [eq(programApplications.submittedBy, auth.user.id)];
  const emails = getVerifiedAccountEmails(auth);

  if (emails.length > 0) {
    ownerConditions.push(inArray(programApplications.email, emails));
  }

  return or(...ownerConditions);
}

function normalizeCreateReviewRequestInput(input: unknown): { applicationId: string; force: boolean } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review request payload is required.");
  }

  const value = input as Record<string, unknown>;
  const applicationId = asUuid(value.applicationId);
  if (!applicationId) throw new Error("A valid application id is required.");

  return { applicationId, force: value.force === true };
}

function normalizeUpdateReviewRequestInput(input: unknown): { id: string; status: ReviewRequestStatus } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review request payload is required.");
  }

  const value = input as Record<string, unknown>;
  const id = asUuid(value.id);
  if (!id) throw new Error("A valid review request id is required.");

  const status = asReviewRequestStatus(value.status);
  if (status === "completed") {
    throw new Error("Review requests are completed by review submission.");
  }

  return { id, status };
}

function asReviewRequestStatus(value: unknown): ReviewRequestStatus {
  return reviewRequestStatuses.includes(value as ReviewRequestStatus)
    ? (value as ReviewRequestStatus)
    : "pending";
}

function isWithinCooldown(value: Date | null, now: Date): boolean {
  return Boolean(value && now.getTime() - value.getTime() < requestCooldownMs);
}

function getVerifiedAccountEmails(auth: ApiAuthContext): string[] {
  return Array.from(
    new Set(
      [auth.user.email, auth.profile.email]
        .map((email) => String(email ?? "").trim().toLowerCase())
        .filter(isValidEmail),
    ),
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function asUuid(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return isUuid(text) ? text : undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), 300);
}
