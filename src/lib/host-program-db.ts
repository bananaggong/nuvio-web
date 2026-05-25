import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable } from "@/db/schema";
import {
  createHostProgramItineraryDay,
  decodeHostProgramMeta,
  encodeHostProgramMeta,
  normalizeHostProgramItineraryDays,
  normalizeHostProgramPlaceInfo,
  type HostProgramDraft,
} from "@/lib/host-program-studio";
import type { PeriodKey, ProgramStatus, ThemeKey } from "@/lib/types";

type ProgramInsert = typeof programsTable.$inferInsert;
type ProgramRow = typeof programsTable.$inferSelect;

type UpsertHostProgramDraftOptions = {
  allowedVillageIds?: string[];
};

const defaultTheme: ThemeKey = "workation";
const defaultPeriod: PeriodKey = "week";
const defaultStatus: ProgramStatus = "upcoming";

export async function listHostProgramDraftsFromDb(options: {
  villageIds?: string[];
} = {}): Promise<HostProgramDraft[]> {
  if (options.villageIds && options.villageIds.length === 0) return [];

  let query = getDb()
    .select()
    .from(programsTable)
    .$dynamic();

  if (options.villageIds) {
    query = query.where(inArray(programsTable.villageId, options.villageIds));
  }

  const rows = await query.orderBy(desc(programsTable.updatedAt)).limit(200);

  return rows.map(mapProgramRowToHostDraft);
}

export async function upsertHostProgramDraft(
  draft: HostProgramDraft,
  options: UpsertHostProgramDraftOptions = {},
): Promise<HostProgramDraft> {
  const insertValue = mapHostDraftToProgramInsert(draft);
  const now = new Date();

  if (options.allowedVillageIds) {
    return upsertScopedHostProgramDraft(
      draft,
      insertValue,
      options.allowedVillageIds,
      now,
    );
  }

  if (isUuid(draft.id)) {
    const [updatedRow] = await getDb()
      .update(programsTable)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(programsTable.id, draft.id))
      .returning();

    if (updatedRow) return mapProgramRowToHostDraft(updatedRow);

    const [createdRow] = await getDb()
      .insert(programsTable)
      .values({ ...insertValue, id: draft.id })
      .onConflictDoUpdate({
        target: programsTable.slug,
        set: { ...insertValue, updatedAt: now },
      })
      .returning();

    return mapProgramRowToHostDraft(createdRow);
  }

  const [row] = await getDb()
    .insert(programsTable)
    .values(insertValue)
    .onConflictDoUpdate({
      target: programsTable.slug,
      set: { ...insertValue, updatedAt: now },
    })
    .returning();

  return mapProgramRowToHostDraft(row);
}

async function upsertScopedHostProgramDraft(
  draft: HostProgramDraft,
  insertValue: ProgramInsert,
  allowedVillageIds: string[],
  now: Date,
): Promise<HostProgramDraft> {
  const villageId = insertValue.villageId;
  if (!villageId || !allowedVillageIds.includes(villageId)) {
    throw new Error("이 계정에 연결된 로컬페이지 프로그램만 저장할 수 있습니다.");
  }

  if (isUuid(draft.id)) {
    const [updatedRow] = await getDb()
      .update(programsTable)
      .set({ ...insertValue, updatedAt: now })
      .where(
        and(
          eq(programsTable.id, draft.id),
          inArray(programsTable.villageId, allowedVillageIds),
        ),
      )
      .returning();

    if (updatedRow) return mapProgramRowToHostDraft(updatedRow);

    const [createdRow] = await getDb()
      .insert(programsTable)
      .values({ ...insertValue, id: draft.id })
      .returning();

    return mapProgramRowToHostDraft(createdRow);
  }

  const [row] = await getDb()
    .insert(programsTable)
    .values(insertValue)
    .returning();

  return mapProgramRowToHostDraft(row);
}

export function normalizeHostProgramDraft(input: unknown): HostProgramDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Program draft payload is required.");
  }

  const value = input as Record<string, unknown>;
  const id = asString(value.id) || `draft-${Date.now()}`;
  const today = toDateString(new Date());
  const meta = decodeHostProgramMeta(asStringArray(value.body));
  const itineraryDays = normalizeHostProgramItineraryDays(
    value.itineraryDays ?? meta.itineraryDays,
  );

  return {
    id,
    villageId: asString(value.villageId),
    slug: asString(value.slug) || undefined,
    title: asString(value.title),
    region: asString(value.region),
    city: asString(value.city),
    summary: asString(value.summary),
    description: asString(value.description),
    theme: asTheme(value.theme),
    periodKey: asPeriod(value.periodKey),
    recruitStart: asDate(value.recruitStart, today),
    recruitEnd: asDate(value.recruitEnd, addDays(today, 14)),
    activityStart: asDate(value.activityStart, addDays(today, 30)),
    activityEnd: asDate(value.activityEnd, addDays(today, 36)),
    target: asString(value.target),
    capacity: asString(value.capacity),
    subsidyLabel: asString(value.subsidyLabel),
    subsidyAmount: asNumber(value.subsidyAmount),
    fee: asString(value.fee),
    status: asStatus(value.status),
    sourceName: asString(value.sourceName),
    sourceUrl: asString(value.sourceUrl),
    applyUrl: asString(value.applyUrl),
    phone: asString(value.phone),
    hashtags: asStringArray(value.hashtags),
    image: asString(value.image),
    itineraryDays:
      itineraryDays.length > 0
        ? itineraryDays
        : [createHostProgramItineraryDay(1)],
    placeInfo: normalizeHostProgramPlaceInfo(value.placeInfo ?? meta.placeInfo),
    published: Boolean(value.published),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

function mapHostDraftToProgramInsert(draft: HostProgramDraft): ProgramInsert {
  const image = draft.image.trim() || fallbackImage;
  const hashtags = normalizeTags(draft.hashtags);
  const itineraryImages = draft.itineraryDays
    .map((day) => day.image.trim())
    .filter(Boolean);
  const body = [
    draft.description.trim() || draft.summary.trim(),
    encodeHostProgramMeta(draft),
  ].filter(Boolean);

  return {
    title: draft.title.trim() || "누비오 program draft",
    slug: draft.slug ?? createProgramSlug(draft.title, draft.id),
    region: draft.region.trim() || "누비오",
    city: draft.city.trim() || "Local",
    isGlobal: false,
    summary: draft.summary.trim() || draft.title.trim(),
    description: draft.description.trim() || draft.summary.trim() || draft.title.trim(),
    theme: draft.theme || defaultTheme,
    categories: [draft.theme || defaultTheme],
    hashtags,
    periodKey: draft.periodKey || defaultPeriod,
    activityStart: draft.activityStart,
    activityEnd: draft.activityEnd,
    recruitStart: draft.recruitStart,
    recruitEnd: draft.recruitEnd,
    target: draft.target.trim() || "Applicants",
    capacity: draft.capacity.trim() || "TBD",
    announcement: `${draft.recruitEnd} 모집 마감`,
    subsidyLabel: draft.subsidyLabel.trim() || "지원 혜택 협의",
    subsidyAmount: Number.isFinite(draft.subsidyAmount) ? draft.subsidyAmount : 0,
    fee: draft.fee.trim() || "TBD",
    applicants: 0,
    status: draft.status || defaultStatus,
    sourceName: draft.sourceName.trim() || "누비오 Host",
    sourceUrl: draft.sourceUrl.trim() || "https://www.nuvio.kr",
    applyUrl: draft.applyUrl.trim() || "https://www.nuvio.kr/apply",
    phone: draft.phone.trim() || "000-0000-0000",
    imageUrl: image,
    gallery: [image, ...itineraryImages],
    badges: hashtags.slice(0, 4),
    body,
    villageId: isUuid(draft.villageId ?? "") ? draft.villageId : null,
    publishedAt: draft.published ? new Date() : null,
  };
}

function mapProgramRowToHostDraft(row: ProgramRow): HostProgramDraft {
  const meta = decodeHostProgramMeta(row.body);
  const itineraryDays =
    meta.itineraryDays.length > 0
      ? meta.itineraryDays
      : [createHostProgramItineraryDay(1)];

  return {
    id: row.id,
    villageId: row.villageId ?? "",
    slug: row.slug,
    title: row.title,
    region: row.region,
    city: row.city,
    summary: row.summary,
    description: row.description,
    theme: row.theme,
    periodKey: row.periodKey,
    recruitStart: normalizeRowDate(row.recruitStart),
    recruitEnd: normalizeRowDate(row.recruitEnd),
    activityStart: normalizeRowDate(row.activityStart),
    activityEnd: normalizeRowDate(row.activityEnd),
    target: row.target,
    capacity: row.capacity,
    subsidyLabel: row.subsidyLabel,
    subsidyAmount: row.subsidyAmount,
    fee: row.fee,
    status: row.status,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    applyUrl: row.applyUrl,
    phone: row.phone,
    hashtags: row.hashtags,
    image: row.imageUrl,
    itineraryDays,
    placeInfo: meta.placeInfo,
    published: Boolean(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createProgramSlug(title: string, id: string): string {
  const base = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
  const suffix = id.replace(/[^a-z0-9]/giu, "").slice(-8);

  return `${base || "program"}-${suffix || Date.now().toString(36)}`;
}

function normalizeTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim().replace(/^#/u, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeRowDate(value: string | Date): string {
  if (typeof value === "string") return value;
  return toDateString(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asDate(value: unknown, fallback: string): string {
  const text = asString(value);
  return /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : fallback;
}

function asTheme(value: unknown): ThemeKey {
  const text = asString(value);
  return themeValues.includes(text as ThemeKey) ? (text as ThemeKey) : defaultTheme;
}

function asPeriod(value: unknown): PeriodKey {
  const text = asString(value);
  return periodValues.includes(text as PeriodKey)
    ? (text as PeriodKey)
    : defaultPeriod;
}

function asStatus(value: unknown): ProgramStatus {
  const text = asString(value);
  return statusValues.includes(text as ProgramStatus)
    ? (text as ProgramStatus)
    : defaultStatus;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const fallbackImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80";

const themeValues: ThemeKey[] = [
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
];

const periodValues: PeriodKey[] = [
  "under4",
  "week",
  "twoWeeks",
  "threeWeeks",
  "month",
];

const statusValues: ProgramStatus[] = [
  "open",
  "upcoming",
  "closed",
  "earlyClosed",
];
