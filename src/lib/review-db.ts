import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplications,
  programs as programsTable,
  reviews as reviewsTable,
  villages,
} from "@/db/schema";
import type { ApiAuthContext } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import type {
  Review,
  ReviewCategory,
  ReviewSource,
  ReviewStatus,
} from "@/lib/types";

export type HostReviewDraft = {
  id: string;
  applicationId?: string;
  title: string;
  category: ReviewCategory;
  programLegacyId?: number;
  programUuid?: string;
  programRunId?: string;
  villageSlug?: string;
  author: string;
  excerpt: string;
  body: string;
  images?: string[];
  rating?: number;
  badge?: string;
  published: boolean;
  status: ReviewStatus;
  source: ReviewSource;
  submittedAt?: string;
  publishedAt?: string;
  moderationNote?: string;
  hiddenReason?: string;
  updatedAt: string;
};

export type ParticipantReviewInput = {
  applicationId: string;
  title?: string;
  category?: ReviewCategory;
  excerpt?: string;
  body?: string;
  images?: string[];
  rating?: number;
};
type NormalizedParticipantReviewInput = {
  applicationId: string;
  title: string;
  category: ReviewCategory;
  excerpt: string;
  body: string;
  images: string[];
  rating?: number;
};

type UpsertHostReviewDraftOptions = {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  actorId?: string;
};

type UpdateHostReviewStatusInput = {
  id: string;
  status: ReviewStatus;
  moderationNote?: string;
  hiddenReason?: string;
};

type ReviewRow = typeof reviewsTable.$inferSelect;
type ReviewInsert = typeof reviewsTable.$inferInsert;

type ParticipantApplicationRow = {
  applicantName: string;
  applicationId: string;
  email: string;
  programId: string;
  programRunId: string | null;
  programTitle: string | null;
  status: string;
  villageSlug: string | null;
};

export class HostReviewAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this review.");
    this.name = "HostReviewAccessError";
  }
}

export class DuplicateReviewError extends Error {
  constructor() {
    super("A review already exists for this application.");
    this.name = "DuplicateReviewError";
  }
}

export class ReviewEligibilityError extends Error {
  constructor(message = "This application is not eligible for a review yet.") {
    super(message);
    this.name = "ReviewEligibilityError";
  }
}

const reviewCategories: ReviewCategory[] = [
  "programTip",
  "selected",
  "rejected",
  "trip",
  "free",
  "question",
];

const reviewStatuses: ReviewStatus[] = ["draft", "pending", "published", "hidden"];
const reviewSources: ReviewSource[] = ["participant", "host", "admin", "imported"];
const participantReviewStatuses = new Set(["accepted", "checkedIn", "completed"]);
const maxReviewImages = 6;

export async function listPublicReviewsFromDb(options: {
  limit?: number;
  villageSlug?: string;
} = {}): Promise<Review[]> {
  const conditions: SQL[] = [eq(reviewsTable.status, "published")];
  const limit = clampLimit(options.limit, 300);

  if (options.villageSlug) {
    conditions.push(eq(reviewsTable.villageSlug, options.villageSlug.trim()));
  }

  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(...conditions))
    .orderBy(desc(reviewsTable.publishedAt), desc(reviewsTable.createdAt))
    .limit(limit);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToReview(review, programLegacyId ?? undefined),
  );
}

export async function listPublicProgramReviewsFromDb(
  programIdentifier: number | string,
  limit = 80,
): Promise<Review[]> {
  const programPredicate = buildProgramIdentifierPredicate(programIdentifier);

  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(eq(reviewsTable.status, "published"), programPredicate))
    .orderBy(desc(reviewsTable.publishedAt), desc(reviewsTable.createdAt))
    .limit(clampLimit(limit, 80));

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToReview(review, programLegacyId ?? undefined),
  );
}

export async function getPublicReviewFromDb(id: string): Promise<Review | null> {
  if (!isUuid(id)) return null;

  const [row] = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(and(eq(reviewsTable.id, id), eq(reviewsTable.status, "published")))
    .limit(1);

  return row ? mapReviewRowToReview(row.review, row.programLegacyId ?? undefined) : null;
}

export async function listMyReviewsFromDb(auth: ApiAuthContext): Promise<HostReviewDraft[]> {
  const ownerConditions: SQL[] = [eq(reviewsTable.userId, auth.user.id)];
  const emails = getVerifiedAccountEmails(auth);

  if (emails.length > 0) {
    ownerConditions.push(inArray(programApplications.email, emails));
  }

  const ownerPredicate = or(...ownerConditions);
  if (!ownerPredicate) return [];

  const rows = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(programApplications, eq(reviewsTable.applicationId, programApplications.id))
    .where(ownerPredicate)
    .orderBy(desc(reviewsTable.updatedAt))
    .limit(100);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToHostDraft(review, programLegacyId ?? undefined),
  );
}

export async function listHostReviewDraftsFromDb(
  options: {
    source?: ReviewSource;
    status?: ReviewStatus;
    villageIds?: string[];
    villageSlugs?: string[];
  } = {},
): Promise<HostReviewDraft[]> {
  const villageSlugs = options.villageSlugs
    ? Array.from(new Set(options.villageSlugs.map((slug) => slug.trim()).filter(Boolean)))
    : undefined;
  const villageIds = options.villageIds
    ? Array.from(new Set(options.villageIds.map((id) => id.trim()).filter(Boolean)))
    : undefined;

  if (villageSlugs && villageSlugs.length === 0) return [];
  if (villageIds && villageIds.length === 0) return [];

  const conditions: SQL[] = [];
  const accessConditions: SQL[] = [];
  if (villageSlugs) accessConditions.push(inArray(reviewsTable.villageSlug, villageSlugs));
  if (villageIds) accessConditions.push(inArray(programsTable.villageId, villageIds));
  if (accessConditions.length === 1) conditions.push(accessConditions[0]);
  if (accessConditions.length > 1) {
    const accessPredicate = or(...accessConditions);
    if (accessPredicate) conditions.push(accessPredicate);
  }
  if (options.status) conditions.push(eq(reviewsTable.status, options.status));
  if (options.source) conditions.push(eq(reviewsTable.source, options.source));

  const baseQuery = getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id));

  const rows = conditions.length > 0
    ? await baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(reviewsTable.updatedAt))
        .limit(300)
    : await baseQuery.orderBy(desc(reviewsTable.updatedAt)).limit(300);

  return rows.map(({ review, programLegacyId }) =>
    mapReviewRowToHostDraft(review, programLegacyId ?? undefined),
  );
}

export async function createParticipantReview(
  input: ParticipantReviewInput,
  auth: ApiAuthContext,
): Promise<HostReviewDraft> {
  const normalized = normalizeParticipantReviewInput(input);
  const emails = getVerifiedAccountEmails(auth);
  const application = await getParticipantReviewApplication({
    applicationId: normalized.applicationId,
    emails,
    userId: auth.user.id,
  });

  if (!application) {
    throw new ReviewEligibilityError("Application was not found for this account.");
  }
  if (!participantReviewStatuses.has(application.status)) {
    throw new ReviewEligibilityError();
  }

  const authorName = maskKoreanName(
    auth.profile.displayName || auth.profile.fullName || application.applicantName,
  );
  const now = new Date();

  const [row] = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`review:${application.applicationId}`}))`,
    );

    const [existingReview] = await tx
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(eq(reviewsTable.applicationId, application.applicationId))
      .limit(1);

    if (existingReview) {
      throw new DuplicateReviewError();
    }

    const [createdReview] = await tx
      .insert(reviewsTable)
      .values({
        applicationId: application.applicationId,
        programId: application.programId,
        programRunId: application.programRunId,
        villageSlug: application.villageSlug,
        userId: auth.user.id,
        title: normalized.title,
        category: normalized.category,
        authorName,
        excerpt: normalized.excerpt,
        body: normalized.body,
        images: normalized.images,
        rating: normalized.rating,
        likes: 0,
        comments: 0,
        badge: null,
        source: "participant",
        status: "pending",
        submittedAt: now,
      })
      .returning();

    await tx
      .update(programApplications)
      .set({ reviewSubmitted: true, updatedAt: now })
      .where(eq(programApplications.id, application.applicationId));

    return [createdReview];
  });

  void safeCreateAuditLog({
    action: "review.create",
    actorId: auth.user.id,
    entityId: row.id,
    entityType: "review",
    metadata: {
      applicationId: application.applicationId,
      programId: application.programId,
      source: "participant",
      status: "pending",
    },
  });

  return mapReviewRowToHostDraft(row);
}

export async function updateParticipantReview(
  reviewId: string,
  input: unknown,
  auth: ApiAuthContext,
): Promise<HostReviewDraft> {
  if (!isUuid(reviewId)) throw new Error("Invalid review id.");

  const normalized = normalizeParticipantReviewUpdateInput(input);
  const existing = await getOwnedMutableReview(reviewId, auth);
  if (!existing) {
    throw new ReviewEligibilityError("Editable review was not found for this account.");
  }

  const now = new Date();
  const [row] = await getDb()
    .update(reviewsTable)
    .set({
      body: normalized.body,
      category: normalized.category,
      excerpt: normalized.excerpt,
      images: normalized.images,
      rating: normalized.rating ?? null,
      status: "pending",
      title: normalized.title,
      updatedAt: now,
    })
    .where(eq(reviewsTable.id, reviewId))
    .returning();

  void safeCreateAuditLog({
    action: "review.update.participant",
    actorId: auth.user.id,
    entityId: row.id,
    entityType: "review",
    metadata: {
      applicationId: row.applicationId,
      status: row.status,
    },
  });

  return mapReviewRowToHostDraft(row, existing.programLegacyId ?? undefined);
}

export async function deleteParticipantReview(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<{ deleted: true }> {
  if (!isUuid(reviewId)) throw new Error("Invalid review id.");

  const existing = await getOwnedMutableReview(reviewId, auth);
  if (!existing) {
    throw new ReviewEligibilityError("Deletable review was not found for this account.");
  }

  await getDb().transaction(async (tx) => {
    await tx.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));

    if (existing.review.applicationId) {
      await tx
        .update(programApplications)
        .set({ reviewSubmitted: false, updatedAt: new Date() })
        .where(eq(programApplications.id, existing.review.applicationId));
    }
  });

  void safeCreateAuditLog({
    action: "review.delete.participant",
    actorId: auth.user.id,
    entityId: reviewId,
    entityType: "review",
    metadata: {
      applicationId: existing.review.applicationId,
      status: existing.review.status,
    },
  });

  return { deleted: true };
}
export async function upsertHostReviewDraft(
  draft: HostReviewDraft,
  options: UpsertHostReviewDraftOptions = {},
): Promise<HostReviewDraft> {
  const allowedVillageSlugs = normalizeAllowedValues(options.allowedVillageSlugs);
  const allowedVillageIds = normalizeAllowedValues(options.allowedVillageIds);
  if (options.allowedVillageSlugs && allowedVillageSlugs?.length === 0) {
    throw new HostReviewAccessError();
  }
  if (options.allowedVillageIds && allowedVillageIds?.length === 0) {
    throw new HostReviewAccessError();
  }

  const insertValue = await mapHostDraftToReviewInsert(draft, {
    allowedVillageIds,
  });
  const now = new Date();

  if (isUuid(draft.id)) {
    const [existingRow] = await getDb()
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, draft.id))
      .limit(1);

    if (existingRow) {
      if (existingRow.source === "participant") {
        throw new HostReviewAccessError();
      }

      assertReviewVillageAccess(existingRow.villageSlug, allowedVillageSlugs);

      const updateValue: Partial<ReviewInsert> = {
        ...insertValue,
        applicationId: insertValue.applicationId ?? existingRow.applicationId,
        comments: existingRow.comments,
        hiddenAt:
          insertValue.status === "hidden"
            ? insertValue.hiddenAt ?? now
            : existingRow.hiddenAt,
        likes: existingRow.likes,
        programId: insertValue.programId ?? existingRow.programId,
        programRunId: insertValue.programRunId ?? existingRow.programRunId,
        publishedAt:
          insertValue.status === "published"
            ? existingRow.publishedAt ?? insertValue.publishedAt ?? now
            : existingRow.publishedAt,
        source: existingRow.source,
        submittedAt: insertValue.submittedAt ?? existingRow.submittedAt,
        updatedAt: now,
        villageSlug: insertValue.villageSlug ?? existingRow.villageSlug,
      };

      const [updatedRow] = await getDb()
        .update(reviewsTable)
        .set(updateValue)
        .where(
          allowedVillageSlugs
            ? and(
                eq(reviewsTable.id, draft.id),
                inArray(reviewsTable.villageSlug, allowedVillageSlugs),
              )
            : eq(reviewsTable.id, draft.id),
        )
        .returning();

      if (updatedRow) {
        void safeCreateAuditLog({
          action: "review.update",
          actorId: options.actorId,
          entityId: updatedRow.id,
          entityType: "review",
          metadata: { status: updatedRow.status, source: updatedRow.source },
        });
        return mapReviewRowToHostDraft(updatedRow, draft.programLegacyId);
      }
    }
  }

  assertReviewVillageAccess(insertValue.villageSlug, allowedVillageSlugs);
  if (insertValue.source === "participant") {
    throw new HostReviewAccessError();
  }

  const [row] = await getDb().insert(reviewsTable).values(insertValue).returning();
  void safeCreateAuditLog({
    action: "review.create.host",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review",
    metadata: { status: row.status, source: row.source },
  });
  return mapReviewRowToHostDraft(row, draft.programLegacyId);
}

export async function updateHostReviewStatus(
  input: UpdateHostReviewStatusInput,
  options: UpsertHostReviewDraftOptions = {},
): Promise<HostReviewDraft> {
  if (!isUuid(input.id)) {
    throw new Error("Invalid review id.");
  }

  const status = asReviewStatus(input.status, "pending");
  const allowedVillageSlugs = normalizeAllowedValues(options.allowedVillageSlugs);
  const allowedVillageIds = normalizeAllowedValues(options.allowedVillageIds);

  const [existing] = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
      programVillageId: programsTable.villageId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .where(eq(reviewsTable.id, input.id))
    .limit(1);

  if (!existing) {
    throw new Error("Review was not found.");
  }

  assertReviewManageAccess({
    allowedVillageIds,
    allowedVillageSlugs,
    programVillageId: existing.programVillageId ?? undefined,
    villageSlug: existing.review.villageSlug,
  });

  const now = new Date();
  const updateValue: Partial<ReviewInsert> = {
    status,
    moderationNote: normalizeOptionalText(input.moderationNote),
    hiddenReason: normalizeOptionalText(input.hiddenReason),
    updatedAt: now,
  };

  if (status === "published") {
    updateValue.publishedAt = existing.review.publishedAt ?? now;
    updateValue.hiddenAt = null;
  }
  if (status === "hidden") {
    updateValue.hiddenAt = now;
  }

  const [row] = await getDb()
    .update(reviewsTable)
    .set(updateValue)
    .where(eq(reviewsTable.id, input.id))
    .returning();

  void safeCreateAuditLog({
    action: "review.status.update",
    actorId: options.actorId,
    entityId: row.id,
    entityType: "review",
    metadata: {
      fromStatus: existing.review.status,
      status: row.status,
    },
  });

  return mapReviewRowToHostDraft(row, existing.programLegacyId ?? undefined);
}

export function normalizeParticipantReviewUpdateInput(input: unknown): Omit<NormalizedParticipantReviewInput, "applicationId"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review payload is required.");
  }

  const value = input as Record<string, unknown>;
  const body = normalizeBody(asString(value.body));
  const excerpt = normalizeExcerpt(asString(value.excerpt) || body.slice(0, 180));
  const title = normalizeTitle(asString(value.title) || excerpt.slice(0, 60));

  return {
    title,
    category: asReviewCategory(value.category),
    excerpt,
    body,
    images: normalizeImages(value.images),
    rating: asOptionalRating(value.rating),
  };
}
export function normalizeHostReviewDraft(input: unknown): HostReviewDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review payload is required.");
  }

  const value = input as Record<string, unknown>;
  const body = asString(value.body);
  const excerpt = asString(value.excerpt) || body.slice(0, 180);
  const title = asString(value.title) || excerpt.slice(0, 60) || "\ucc38\uc5ec \ud6c4\uae30";
  const explicitStatus = asOptionalReviewStatus(value.status);
  const status = explicitStatus ?? asStatusFromPublished(value.published);

  return {
    id: asString(value.id) || `review-${Date.now()}`,
    applicationId: asOptionalUuid(value.applicationId),
    title: normalizeTitle(title),
    category: asReviewCategory(value.category),
    programLegacyId: asOptionalNumber(value.programLegacyId),
    programUuid: asOptionalUuid(value.programUuid ?? value.programId),
    programRunId: asOptionalUuid(value.programRunId),
    villageSlug: asOptionalString(value.villageSlug),
    author: maskKoreanName(asString(value.author) || "\uc775\uba85"),
    excerpt: normalizeExcerpt(excerpt),
    body: normalizeBody(body || excerpt),
    images: normalizeImages(value.images),
    rating: asOptionalRating(value.rating),
    badge: asOptionalString(value.badge),
    published: status === "published",
    status,
    source: asReviewSource(value.source, "host"),
    submittedAt: asOptionalString(value.submittedAt),
    publishedAt: asOptionalString(value.publishedAt),
    moderationNote: asOptionalString(value.moderationNote),
    hiddenReason: asOptionalString(value.hiddenReason),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

export function normalizeParticipantReviewInput(input: unknown): NormalizedParticipantReviewInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Review payload is required.");
  }

  const value = input as Record<string, unknown>;
  const applicationId = asOptionalUuid(value.applicationId);
  if (!applicationId) {
    throw new Error("A valid application id is required.");
  }

  const body = normalizeBody(asString(value.body));
  const excerpt = normalizeExcerpt(asString(value.excerpt) || body.slice(0, 180));
  const title = normalizeTitle(asString(value.title) || excerpt.slice(0, 60));

  return {
    applicationId,
    title,
    category: asReviewCategory(value.category),
    excerpt,
    body,
    images: normalizeImages(value.images),
    rating: asOptionalRating(value.rating),
  };
}

export function maskKoreanName(value: string): string {
  const text = value.trim();
  if (!text) return "\uc775\uba85";
  if (text.includes("*")) return text;
  if (isValidEmail(text)) return maskEmail(text);

  const koreanNamePattern = /[\uAC00-\uD7A3]{2,4}/gu;
  const maskedKorean = text.replace(koreanNamePattern, (name) => maskNameToken(name));
  if (maskedKorean !== text) return maskedKorean;

  return maskNameToken(text);
}

async function getOwnedMutableReview(
  reviewId: string,
  auth: ApiAuthContext,
): Promise<{ review: ReviewRow; programLegacyId: number | null } | null> {
  const ownerConditions: SQL[] = [eq(reviewsTable.userId, auth.user.id)];
  const emails = getVerifiedAccountEmails(auth);

  if (emails.length > 0) {
    ownerConditions.push(inArray(programApplications.email, emails));
  }

  const ownerPredicate = or(...ownerConditions);
  if (!ownerPredicate) return null;

  const [row] = await getDb()
    .select({
      review: reviewsTable,
      programLegacyId: programsTable.legacyId,
    })
    .from(reviewsTable)
    .leftJoin(programsTable, eq(reviewsTable.programId, programsTable.id))
    .leftJoin(programApplications, eq(reviewsTable.applicationId, programApplications.id))
    .where(
      and(
        eq(reviewsTable.id, reviewId),
        ownerPredicate,
        inArray(reviewsTable.status, ["draft", "pending"]),
      ),
    )
    .limit(1);

  return row ?? null;
}
async function getParticipantReviewApplication(input: {
  applicationId: string;
  emails: string[];
  userId: string;
}): Promise<ParticipantApplicationRow | null> {
  const ownerConditions: SQL[] = [eq(programApplications.submittedBy, input.userId)];
  if (input.emails.length > 0) {
    ownerConditions.push(inArray(programApplications.email, input.emails));
  }
  const ownerPredicate = or(...ownerConditions);
  if (!ownerPredicate) return null;

  const [row] = await getDb()
    .select({
      applicantName: programApplications.applicantName,
      applicationId: programApplications.id,
      email: programApplications.email,
      programId: programApplications.programId,
      programRunId: programApplications.programRunId,
      programTitle: programsTable.title,
      status: programApplications.status,
      villageSlug: villages.slug,
    })
    .from(programApplications)
    .leftJoin(programsTable, eq(programApplications.programId, programsTable.id))
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .where(and(eq(programApplications.id, input.applicationId), ownerPredicate))
    .limit(1);

  return row ?? null;
}

async function mapHostDraftToReviewInsert(
  draft: HostReviewDraft,
  options: { allowedVillageIds?: string[] } = {},
): Promise<ReviewInsert> {
  const programContext = await resolveProgramContext(draft, {
    allowedVillageIds: options.allowedVillageIds,
  });
  const status = draft.status;
  const now = new Date();

  return {
    applicationId: draft.applicationId ?? null,
    programId: programContext.programId,
    programRunId: draft.programRunId ?? null,
    villageSlug: draft.villageSlug?.trim() || programContext.villageSlug || null,
    title: normalizeTitle(draft.title),
    category: draft.category,
    authorName: maskKoreanName(draft.author.trim() || "\uc775\uba85"),
    excerpt: normalizeExcerpt(draft.excerpt || draft.body.slice(0, 180)),
    body: normalizeBody(draft.body || draft.excerpt),
    images: normalizeImages(draft.images),
    rating: draft.rating ?? null,
    likes: 0,
    comments: 0,
    badge: draft.badge?.trim() || null,
    source: draft.source,
    status,
    submittedAt: draft.submittedAt ? new Date(draft.submittedAt) : now,
    publishedAt: status === "published" ? parseDateOrFallback(draft.publishedAt, now) : null,
    hiddenAt: status === "hidden" ? now : null,
    moderationNote: draft.moderationNote?.trim() || null,
    hiddenReason: draft.hiddenReason?.trim() || null,
  };
}

async function resolveProgramContext(
  draft: HostReviewDraft,
  options: { allowedVillageIds?: string[] } = {},
): Promise<{ programId: string | null; villageSlug?: string | null }> {
  if (draft.programUuid) {
    return resolveProgramByPredicate(eq(programsTable.id, draft.programUuid), options);
  }
  if (draft.programLegacyId) {
    return resolveProgramByPredicate(eq(programsTable.legacyId, draft.programLegacyId), options);
  }
  return { programId: null };
}

async function resolveProgramByPredicate(
  predicate: SQL,
  options: { allowedVillageIds?: string[] } = {},
): Promise<{ programId: string | null; villageSlug?: string | null }> {
  if (options.allowedVillageIds && options.allowedVillageIds.length === 0) {
    throw new HostReviewAccessError();
  }

  const conditions = [predicate];
  if (options.allowedVillageIds) {
    conditions.push(inArray(programsTable.villageId, options.allowedVillageIds));
  }

  const [row] = await getDb()
    .select({ id: programsTable.id, villageSlug: villages.slug })
    .from(programsTable)
    .leftJoin(villages, eq(programsTable.villageId, villages.id))
    .where(and(...conditions))
    .limit(1);

  if (!row && options.allowedVillageIds) {
    throw new HostReviewAccessError();
  }

  return { programId: row?.id ?? null, villageSlug: row?.villageSlug ?? null };
}

function mapReviewRowToReview(
  row: ReviewRow,
  programLegacyId?: number,
): Review {
  return {
    id: row.id,
    applicationId: row.applicationId ?? undefined,
    title: row.title,
    category: row.category,
    programId: programLegacyId,
    programUuid: row.programId ?? undefined,
    programRunId: row.programRunId ?? undefined,
    villageSlug: row.villageSlug ?? undefined,
    author: row.authorName,
    date: (row.publishedAt ?? row.createdAt).toISOString(),
    excerpt: row.excerpt,
    body: row.body,
    images: row.images,
    rating: row.rating ?? undefined,
    likes: row.likes,
    comments: row.comments,
    badge: row.badge ?? undefined,
    source: asReviewSource(row.source, "host"),
    status: row.status,
    submittedAt: row.submittedAt?.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
  };
}

function mapReviewRowToHostDraft(
  row: ReviewRow,
  programLegacyId?: number,
): HostReviewDraft {
  return {
    id: row.id,
    applicationId: row.applicationId ?? undefined,
    title: row.title,
    category: row.category,
    programLegacyId,
    programUuid: row.programId ?? undefined,
    programRunId: row.programRunId ?? undefined,
    villageSlug: row.villageSlug ?? undefined,
    author: row.authorName,
    excerpt: row.excerpt,
    body: row.body,
    images: row.images,
    rating: row.rating ?? undefined,
    badge: row.badge ?? undefined,
    published: row.status === "published",
    status: row.status,
    source: asReviewSource(row.source, "host"),
    submittedAt: row.submittedAt?.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
    moderationNote: row.moderationNote ?? undefined,
    hiddenReason: row.hiddenReason ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildProgramIdentifierPredicate(programIdentifier: number | string): SQL {
  const key = String(programIdentifier).trim();
  if (isUuid(key)) return eq(programsTable.id, key);

  const numericId = Number(key);
  return Number.isInteger(numericId)
    ? eq(programsTable.legacyId, numericId)
    : eq(programsTable.slug, key);
}

function asReviewCategory(value: unknown): ReviewCategory {
  const text = asString(value);
  return reviewCategories.includes(text as ReviewCategory)
    ? (text as ReviewCategory)
    : "trip";
}

function asOptionalReviewStatus(value: unknown): ReviewStatus | undefined {
  const text = asString(value);
  return reviewStatuses.includes(text as ReviewStatus)
    ? (text as ReviewStatus)
    : undefined;
}

function asReviewStatus(value: unknown, fallback: ReviewStatus): ReviewStatus {
  return asOptionalReviewStatus(value) ?? fallback;
}

function asStatusFromPublished(value: unknown): ReviewStatus {
  if (typeof value === "boolean") return value ? "published" : "draft";
  return "draft";
}

function asReviewSource(value: unknown, fallback: ReviewSource): ReviewSource {
  const text = asString(value);
  return reviewSources.includes(text as ReviewSource)
    ? (text as ReviewSource)
    : fallback;
}

function normalizeBody(value: string): string {
  const text = value.trim();
  if (text.length < 10) throw new Error("Review body must be at least 10 characters.");
  if (text.length > 5000) throw new Error("Review body must be 5000 characters or less.");
  return text;
}

function normalizeExcerpt(value: string): string {
  const text = value.trim();
  if (!text) throw new Error("Review excerpt is required.");
  if (text.length > 300) throw new Error("Review excerpt must be 300 characters or less.");
  return text;
}

function normalizeTitle(value: string): string {
  const text = value.trim();
  if (text.length < 2) throw new Error("Review title must be at least 2 characters.");
  if (text.length > 120) throw new Error("Review title must be 120 characters or less.");
  return text;
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(isSafeImageUrl)
        .slice(0, maxReviewImages),
    ),
  );
}

function isSafeImageUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text || undefined;
}

function normalizeOptionalText(value: unknown): string | null {
  const text = asString(value);
  return text ? text.slice(0, 1000) : null;
}

function asOptionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : undefined;
}

function asOptionalRating(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 5) {
    throw new Error("Review rating must be an integer from 1 to 5.");
  }
  return numberValue;
}

function asOptionalUuid(value: unknown): string | undefined {
  const text = asString(value);
  return isUuid(text) ? text : undefined;
}

function normalizeAllowedValues(
  values: string[] | undefined,
): string[] | undefined {
  return values
    ? Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    : undefined;
}

function assertReviewVillageAccess(
  villageSlug: string | null | undefined,
  allowedVillageSlugs: string[] | undefined,
) {
  if (!allowedVillageSlugs) return;
  if (!villageSlug || !allowedVillageSlugs.includes(villageSlug)) {
    throw new HostReviewAccessError();
  }
}

function assertReviewManageAccess(input: {
  allowedVillageIds?: string[];
  allowedVillageSlugs?: string[];
  programVillageId?: string;
  villageSlug?: string | null;
}) {
  if (!input.allowedVillageIds && !input.allowedVillageSlugs) return;

  if (
    input.villageSlug &&
    input.allowedVillageSlugs?.includes(input.villageSlug)
  ) {
    return;
  }
  if (
    input.programVillageId &&
    input.allowedVillageIds?.includes(input.programVillageId)
  ) {
    return;
  }

  throw new HostReviewAccessError();
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

function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@");
  if (local.length <= 2) return `${local.slice(0, 1)}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskNameToken(value: string): string {
  const token = value.trim();
  if (token.length <= 1) return token || "\uc775\uba85";
  if (token.length === 2) return `${token[0]}*`;
  return `${token[0]}*${token[token.length - 1]}`;
}

function parseDateOrFallback(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), 300);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}