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
  VillageMediaCategory,
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
export const villageMediaCategoryEnum = pgEnum("village_media_category", [
  "original",
  "broadcast",
  "archive",
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
export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "screening",
  "accepted",
  "rejected",
  "checkedIn",
  "completed",
]);
export const messageChannelEnum = pgEnum("message_channel", ["sms", "email", "kakao"]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "inApp",
  "email",
  "sms",
  "kakao",
]);
export const notificationEventStatusEnum = pgEnum("notification_event_status", [
  "pending",
  "sent",
  "failed",
  "skipped",
]);
export const messageDeliveryStatusEnum = pgEnum("message_delivery_status", [
  "draft",
  "scheduled",
  "sent",
  "failed",
]);
export const participantDocumentTypeEnum = pgEnum("participant_document_type", [
  "receipt",
  "signature",
  "review",
  "transfer",
]);
export const participantDocumentStatusEnum = pgEnum("participant_document_status", [
  "pending",
  "submitted",
  "approved",
  "rejected",
]);
export const reportProjectStatusEnum = pgEnum("report_project_status", [
  "draft",
  "collecting",
  "ready",
  "submitted",
]);
export const reportExportStatusEnum = pgEnum("report_export_status", [
  "generated",
  "submitted",
  "revised",
]);
export const villagePageSectionStatusEnum = pgEnum(
  "village_page_section_status",
  ["draft", "published", "archived"],
);
export const hostVillageRoleEnum = pgEnum("host_village_role", [
  "owner",
  "manager",
  "editor",
  "viewer",
]);
export const hostVillageGrantStatusEnum = pgEnum("host_village_grant_status", [
  "pending",
  "active",
  "revoked",
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
    onboardingIntent: text("onboarding_intent").$type<
      "participant" | "host" | null
    >(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
    contactEmail: text("contact_email"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("profiles_email_idx").on(table.email)],
);

export const villages = pgTable(
  "villages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    region: text("region").notNull(),
    city: text("city").notNull(),
    tagline: text("tagline").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    heroImageUrl: text("hero_image_url").notNull(),
    logoText: text("logo_text"),
    brandColor: text("brand_color").default("#0f766e").notNull(),
    accentColor: text("accent_color").default("#f59e0b").notNull(),
    instagramUrl: text("instagram_url"),
    kakaoUrl: text("kakao_url"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    programIds: jsonb("program_ids")
      .$type<Array<number | string>>()
      .default(emptyArray)
      .notNull(),
    links: jsonb("links")
      .$type<Array<Record<string, unknown>>>()
      .default(emptyArray)
      .notNull(),
    sections: jsonb("sections")
      .$type<Array<Record<string, unknown>>>()
      .default(emptyArray)
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("villages_slug_idx").on(table.slug),
    index("villages_region_idx").on(table.region),
    index("villages_published_at_idx").on(table.publishedAt),
  ],
);

export const hostVillageMemberships = pgTable(
  "host_village_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    villageId: uuid("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    accountEmail: text("account_email").notNull(),
    role: hostVillageRoleEnum("role").default("owner").notNull(),
    status: hostVillageGrantStatusEnum("status").default("pending").notNull(),
    grantedBy: uuid("granted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("host_village_memberships_village_account_email_idx").on(
      table.villageId,
      table.accountEmail,
    ),
    index("host_village_memberships_village_id_idx").on(table.villageId),
    index("host_village_memberships_user_id_idx").on(table.userId),
    index("host_village_memberships_status_idx").on(table.status),
  ],
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
    villageId: uuid("village_id").references(() => villages.id, {
      onDelete: "set null",
    }),
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
    index("programs_village_id_idx").on(table.villageId),
  ],
);

export const homepageHeroSlides = pgTable(
  "homepage_hero_slides",
  {
    id: text("id").primaryKey(),
    eyebrow: text("eyebrow").default("").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    imageUrl: text("image_url").notNull(),
    href: text("href").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    published: boolean("published").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("homepage_hero_slides_published_idx").on(table.published),
    index("homepage_hero_slides_sort_order_idx").on(table.sortOrder),
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
    sourceName: text("source_name").default("누비오").notNull(),
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
    villageSlug: text("village_slug"),
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
    index("reviews_village_slug_idx").on(table.villageSlug),
    index("reviews_status_idx").on(table.status),
  ],
);

export const villageMediaContents = pgTable(
  "village_media_contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    legacyId: text("legacy_id").unique(),
    villageSlug: text("village_slug").notNull(),
    title: text("title").notNull(),
    category: villageMediaCategoryEnum("category")
      .$type<VillageMediaCategory>()
      .notNull(),
    provider: text("provider").default("link").notNull(),
    summary: text("summary").notNull(),
    body: jsonb("body").$type<string[]>().default(emptyArray).notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    embedUrl: text("embed_url"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    featured: boolean("featured").default(false).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("village_media_contents_legacy_id_idx").on(table.legacyId),
    index("village_media_contents_village_slug_idx").on(table.villageSlug),
    index("village_media_contents_published_at_idx").on(table.publishedAt),
  ],
);

export const hostSocialConnections = pgTable(
  "host_social_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    villageSlug: text("village_slug").notNull(),
    provider: text("provider").default("facebook").notNull(),
    facebookUserId: text("facebook_user_id"),
    pageId: text("page_id"),
    pageName: text("page_name"),
    pageAccessToken: text("page_access_token"),
    instagramUserId: text("instagram_user_id"),
    instagramUsername: text("instagram_username"),
    accessToken: text("access_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    permissions: jsonb("permissions").$type<string[]>().default(emptyArray).notNull(),
    status: text("status").default("connected").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    raw: jsonb("raw").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("host_social_connections_village_provider_idx").on(
      table.villageSlug,
      table.provider,
    ),
    index("host_social_connections_instagram_user_idx").on(table.instagramUserId),
  ],
);

export const villagePageSections = pgTable(
  "village_page_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    villageSlug: text("village_slug").notNull(),
    pageKey: text("page_key").default("home").notNull(),
    sectionKey: text("section_key").notNull(),
    sectionType: text("section_type").notNull(),
    label: text("label").notNull(),
    draftContent: jsonb("draft_content")
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    publishedContent: jsonb("published_content").$type<Record<string, unknown>>(),
    orderIndex: integer("order_index").default(100).notNull(),
    publishedOrderIndex: integer("published_order_index"),
    visible: boolean("visible").default(true).notNull(),
    publishedVisible: boolean("published_visible"),
    status: villagePageSectionStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("village_page_sections_unique_idx").on(
      table.villageSlug,
      table.pageKey,
      table.sectionKey,
    ),
    index("village_page_sections_public_idx").on(
      table.villageSlug,
      table.pageKey,
      table.publishedAt,
    ),
    index("village_page_sections_status_idx").on(table.status),
  ],
);

export const villagePageRevisions = pgTable(
  "village_page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .references(() => villagePageSections.id, { onDelete: "cascade" })
      .notNull(),
    villageSlug: text("village_slug").notNull(),
    pageKey: text("page_key").notNull(),
    sectionKey: text("section_key").notNull(),
    content: jsonb("content")
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    orderIndex: integer("order_index").default(100).notNull(),
    visible: boolean("visible").default(true).notNull(),
    publishedBy: uuid("published_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("village_page_revisions_section_id_idx").on(table.sectionId),
    index("village_page_revisions_page_idx").on(
      table.villageSlug,
      table.pageKey,
      table.createdAt,
    ),
  ],
);

export const villageAssets = pgTable(
  "village_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    villageSlug: text("village_slug").notNull(),
    fileName: text("file_name").notNull(),
    url: text("url").notNull(),
    altText: text("alt_text"),
    usage: text("usage").default("page").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("village_assets_village_slug_idx").on(table.villageSlug),
    index("village_assets_usage_idx").on(table.usage),
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

export const programApplicationForms = pgTable(
  "program_application_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "cascade",
    }),
    programTitle: text("program_title"),
    title: text("title").notNull(),
    description: text("description"),
    fields: jsonb("fields").$type<Array<Record<string, unknown>>>().default(emptyArray).notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("program_application_forms_program_id_idx").on(table.programId)],
);

export const programApplications = pgTable(
  "program_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .references(() => programs.id, { onDelete: "cascade" })
      .notNull(),
    formId: uuid("form_id").references(() => programApplicationForms.id, {
      onDelete: "set null",
    }),
    applicantName: text("applicant_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    status: applicationStatusEnum("status").default("submitted").notNull(),
    answers: jsonb("answers").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    paymentAmount: integer("payment_amount").default(0).notNull(),
    paymentMethod: text("payment_method"),
    receiptCount: integer("receipt_count").default(0).notNull(),
    signatureCompleted: boolean("signature_completed").default(false).notNull(),
    reviewSubmitted: boolean("review_submitted").default(false).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("program_applications_program_id_idx").on(table.programId),
    index("program_applications_status_idx").on(table.status),
    index("program_applications_email_idx").on(table.email),
  ],
);

export const applicationStatusEvents = pgTable(
  "application_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => programApplications.id, { onDelete: "cascade" })
      .notNull(),
    fromStatus: applicationStatusEnum("from_status"),
    toStatus: applicationStatusEnum("to_status").notNull(),
    note: text("note"),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("application_status_events_application_id_idx").on(table.applicationId),
  ],
);

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    channel: messageChannelEnum("channel").default("sms").notNull(),
    trigger: text("trigger").notNull(),
    body: text("body").notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("message_templates_program_id_idx").on(table.programId)],
);

export const messageCampaigns = pgTable(
  "message_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    templateKey: text("template_key").notNull(),
    channel: messageChannelEnum("channel").default("email").notNull(),
    targetStatus: text("target_status").default("all").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: messageDeliveryStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("message_campaigns_status_idx").on(table.status),
    index("message_campaigns_scheduled_at_idx").on(table.scheduledAt),
  ],
);

export const scheduledMessages = pgTable(
  "scheduled_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id").references(() => messageTemplates.id, {
      onDelete: "set null",
    }),
    applicationId: uuid("application_id").references(() => programApplications.id, {
      onDelete: "cascade",
    }),
    channel: messageChannelEnum("channel").default("sms").notNull(),
    recipient: text("recipient").notNull(),
    body: text("body").notNull(),
    deliveryStatus: messageDeliveryStatusEnum("delivery_status")
      .default("draft")
      .notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scheduled_messages_application_id_idx").on(table.applicationId),
    index("scheduled_messages_delivery_status_idx").on(table.deliveryStatus),
  ],
);

export const participantDocuments = pgTable(
  "participant_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => programApplications.id, { onDelete: "cascade" })
      .notNull(),
    type: participantDocumentTypeEnum("type").notNull(),
    status: participantDocumentStatusEnum("status").default("pending").notNull(),
    fileUrl: text("file_url"),
    amount: integer("amount"),
    note: text("note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("participant_documents_application_id_idx").on(table.applicationId),
    index("participant_documents_status_idx").on(table.status),
  ],
);

export const reportProjects = pgTable(
  "report_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    organizationName: text("organization_name").notNull(),
    reportType: text("report_type").notNull(),
    status: reportProjectStatusEnum("status").default("draft").notNull(),
    schema: jsonb("schema").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("report_projects_program_id_idx").on(table.programId),
    index("report_projects_status_idx").on(table.status),
  ],
);

export const reportExports = pgTable(
  "report_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportProjectId: uuid("report_project_id")
      .references(() => reportProjects.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").default(1).notNull(),
    status: reportExportStatusEnum("status").default("generated").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default(emptyObject).notNull(),
    fileUrl: text("file_url"),
    generatedBy: uuid("generated_by"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_exports_report_project_id_idx").on(table.reportProjectId),
    uniqueIndex("report_exports_project_version_idx").on(
      table.reportProjectId,
      table.version,
    ),
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

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .primaryKey(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  emailEnabled: boolean("email_enabled").default(false).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  kakaoEnabled: boolean("kakao_enabled").default(false).notNull(),
  programDeadlineEnabled: boolean("program_deadline_enabled").default(true).notNull(),
  applicationStatusEnabled: boolean("application_status_enabled")
    .default(true)
    .notNull(),
  announcementEnabled: boolean("announcement_enabled").default(true).notNull(),
  marketingEnabled: boolean("marketing_enabled").default(false).notNull(),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userNotifications = pgTable(
  "user_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_notifications_user_created_idx").on(table.userId, table.createdAt),
    index("user_notifications_user_read_idx").on(table.userId, table.readAt),
  ],
);

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    channel: notificationChannelEnum("channel").default("inApp").notNull(),
    status: notificationEventStatusEnum("status").default("pending").notNull(),
    recipientUserId: uuid("recipient_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    recipient: text("recipient"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_events_status_idx").on(table.status, table.scheduledFor),
    index("notification_events_recipient_user_idx").on(table.recipientUserId),
    index("notification_events_event_type_idx").on(table.eventType),
  ],
);
