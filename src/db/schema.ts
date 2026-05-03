import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AnnouncementType,
  PeriodKey,
  ProgramStatus,
  ReviewCategory,
  ThemeKey,
} from "@/lib/types";

export const userRoleEnum = pgEnum("user_role", ["user", "partner", "admin"]);
export const programStatusEnum = pgEnum("program_status", [
  "open",
  "upcoming",
  "closed",
  "earlyClosed",
]);
export const themeKeyEnum = pgEnum("theme_key", [
  "short",
  "month",
  "workation",
  "local",
  "returnFarm",
  "event",
  "pet",
  "half",
  "daily",
  "family",
  "easy",
  "benefit",
  "exclusive",
]);
export const periodKeyEnum = pgEnum("period_key", [
  "under4",
  "week",
  "twoWeeks",
  "threeWeeks",
  "month",
]);
export const announcementTypeEnum = pgEnum("announcement_type", [
  "close",
  "change",
  "notice",
  "open",
]);
export const reviewCategoryEnum = pgEnum("review_category", [
  "programTip",
  "selected",
  "rejected",
  "trip",
  "free",
  "question",
]);
export const reviewStatusEnum = pgEnum("review_status", [
  "draft",
  "published",
  "hidden",
]);
export const sourceTypeEnum = pgEnum("external_source_type", ["rss"]);
export const leadConfidenceEnum = pgEnum("lead_confidence", [
  "high",
  "medium",
  "low",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "approved",
  "rejected",
  "draftCreated",
]);
export const leadDecisionEnum = pgEnum("lead_decision", ["approved", "rejected"]);
export const partnerSubmissionStatusEnum = pgEnum("partner_submission_status", [
  "submitted",
  "reviewing",
  "approved",
  "rejected",
]);

const emptyArray = sql`'[]'::jsonb`;
const emptyObject = sql`'{}'::jsonb`;

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: userRoleEnum("role").default("user").notNull(),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("profiles_email_idx").on(table.email)],
);

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    legacyId: integer("legacy_id").unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    region: text("region").notNull(),
    city: text("city").notNull(),
    isGlobal: boolean("is_global").default(false).notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    theme: themeKeyEnum("theme").$type<ThemeKey>().notNull(),
    categories: jsonb("categories").$type<ThemeKey[]>().default(emptyArray).notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().default(emptyArray).notNull(),
    periodKey: periodKeyEnum("period_key").$type<PeriodKey>().notNull(),
    activityStart: date("activity_start").notNull(),
    activityEnd: date("activity_end").notNull(),
    recruitStart: date("recruit_start").notNull(),
    recruitEnd: date("recruit_end").notNull(),
    target: text("target").notNull(),
    capacity: text("capacity").notNull(),
    announcement: text("announcement").notNull(),
    subsidyLabel: text("subsidy_label").notNull(),
    subsidyAmount: integer("subsidy_amount").default(0).notNull(),
    fee: text("fee").notNull(),
    applicants: integer("applicants").default(0).notNull(),
    status: programStatusEnum("status").$type<ProgramStatus>().notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    applyUrl: text("apply_url").notNull(),
    phone: text("phone").notNull(),
    imageUrl: text("image_url").notNull(),
    gallery: jsonb("gallery").$type<string[]>().default(emptyArray).notNull(),
    badges: jsonb("badges").$type<string[]>().default(emptyArray).notNull(),
    body: jsonb("body").$type<string[]>().default(emptyArray).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    approvedBy: uuid("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("programs_slug_idx").on(table.slug),
    index("programs_region_idx").on(table.region),
    index("programs_status_idx").on(table.status),
    index("programs_recruit_end_idx").on(table.recruitEnd),
  ],
);

export const externalAnnouncementSources = pgTable("external_announcement_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: sourceTypeEnum("type").default("rss").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default(emptyArray).notNull(),
  minimumKeywordMatches: integer("minimum_keyword_matches").default(0).notNull(),
  notes: text("notes"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const externalAnnouncements = pgTable(
  "external_announcements",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").references(() => externalAnnouncementSources.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: announcementTypeEnum("type").$type<AnnouncementType>().notNull(),
    sourceUrl: text("source_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    relevance: integer("relevance").default(0).notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("external_announcements_source_url_idx").on(
      table.sourceId,
      table.sourceUrl,
    ),
    index("external_announcements_published_at_idx").on(table.publishedAt),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    legacyId: integer("legacy_id").unique(),
    title: text("title").notNull(),
    type: announcementTypeEnum("type").$type<AnnouncementType>().notNull(),
    body: text("body").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    sourceId: text("source_id"),
    sourceName: text("source_name").default("NUVIO").notNull(),
    sourceUrl: text("source_url"),
    isExternal: boolean("is_external").default(false).notNull(),
    relevance: integer("relevance").default(0).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("announcements_date_idx").on(table.date),
    index("announcements_program_id_idx").on(table.programId),
  ],
);

export const programLeads = pgTable(
  "program_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceAnnouncementId: text("source_announcement_id").references(
      () => externalAnnouncements.id,
      { onDelete: "set null" },
    ),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    confidence: leadConfidenceEnum("confidence").default("low").notNull(),
    score: integer("score").default(0).notNull(),
    suggestedRegion: text("suggested_region"),
    suggestedThemes: jsonb("suggested_themes").$type<ThemeKey[]>().default(emptyArray).notNull(),
    suggestedStatus: programStatusEnum("suggested_status").$type<ProgramStatus>().notNull(),
    reasons: jsonb("reasons").$type<string[]>().default(emptyArray).notNull(),
    status: leadStatusEnum("status").default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("program_leads_source_announcement_idx").on(table.sourceAnnouncementId),
    index("program_leads_status_idx").on(table.status),
    index("program_leads_score_idx").on(table.score),
  ],
);

export const programLeadDecisions = pgTable(
  "program_lead_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .references(() => programLeads.id, { onDelete: "cascade" })
      .notNull(),
    decision: leadDecisionEnum("decision").notNull(),
    note: text("note"),
    decidedBy: uuid("decided_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("program_lead_decisions_lead_id_idx").on(table.leadId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    legacyId: integer("legacy_id").unique(),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id"),
    title: text("title").notNull(),
    category: reviewCategoryEnum("category").$type<ReviewCategory>().notNull(),
    authorName: text("author_name").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    images: jsonb("images").$type<string[]>().default(emptyArray).notNull(),
    likes: integer("likes").default(0).notNull(),
    comments: integer("comments").default(0).notNull(),
    badge: text("badge"),
    status: reviewStatusEnum("status").default("published").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_program_id_idx").on(table.programId),
    index("reviews_status_idx").on(table.status),
  ],
);

export const savedPrograms = pgTable(
  "saved_programs",
  {
    userId: uuid("user_id").notNull(),
    programId: uuid("program_id")
      .references(() => programs.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.programId] }),
    index("saved_programs_program_id_idx").on(table.programId),
  ],
);

export const partnerSubmissions = pgTable(
  "partner_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationName: text("organization_name").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    title: text("title").notNull(),
    region: text("region"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    status: partnerSubmissionStatusEnum("status").default("submitted").notNull(),
    submittedBy: uuid("submitted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("partner_submissions_status_idx").on(table.status),
    index("partner_submissions_contact_email_idx").on(table.contactEmail),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_logs_actor_id_idx").on(table.actorId),
    index("admin_audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);
