import { desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villages as villagesTable } from "@/db/schema";
import { getPublicProgramByIdentifier, listPublicPrograms } from "@/lib/public-program-db";
import { seedVillages } from "@/lib/village-seeds";
import type { Program } from "@/lib/types";
import type { Village, VillageLink, VillageSection } from "@/lib/village-types";

type VillageInsert = typeof villagesTable.$inferInsert;
type VillageRow = typeof villagesTable.$inferSelect;

export async function listPublicVillages(): Promise<Village[]> {
  try {
    const rows = await getDb()
      .select()
      .from(villagesTable)
      .where(isNotNull(villagesTable.publishedAt))
      .orderBy(desc(villagesTable.updatedAt))
      .limit(200);

    return mergeVillages(rows.map(mapVillageRowToVillage), seedVillages);
  } catch {
    return seedVillages;
  }
}

export async function listHostVillagesFromDb(): Promise<Village[]> {
  try {
    const rows = await getDb()
      .select()
      .from(villagesTable)
      .orderBy(desc(villagesTable.updatedAt))
      .limit(200);

    return mergeVillages(rows.map(mapVillageRowToVillage), seedVillages);
  } catch {
    return seedVillages;
  }
}

export async function getPublicVillageBySlug(
  slug: string,
): Promise<Village | undefined> {
  const key = slug.trim().toLowerCase();
  if (!key) return undefined;

  try {
    const rows = await getDb()
      .select()
      .from(villagesTable)
      .where(eq(villagesTable.slug, key))
      .limit(1);
    const row = rows[0];

    if (row?.publishedAt) return mapVillageRowToVillage(row);
  } catch {
    const seed = seedVillages.find((village) => village.slug === key);
    if (seed?.published) return seed;
  }

  return seedVillages.find(
    (village) => village.slug === key && village.published,
  );
}

export async function getVillagePrograms(village: Village): Promise<Program[]> {
  const programs = await listPublicPrograms();
  const programIds = new Set(village.programIds.map((id) => String(id)));

  if (programIds.size === 0) {
    return programs
      .filter(
        (program) =>
          program.region === village.region &&
          (program.city === village.city || program.city.startsWith(village.city)),
      )
      .slice(0, 6);
  }

  return programs.filter(
    (program) => programIds.has(String(program.id)) || programIds.has(program.slug),
  );
}

export async function resolveVillageProgram(
  village: Village,
  programIdentifier: string,
): Promise<Program | undefined> {
  const program = await getPublicProgramByIdentifier(programIdentifier);
  if (!program) return undefined;

  const programIds = new Set(village.programIds.map((id) => String(id)));
  if (programIds.size === 0) {
    return program.region === village.region ? program : undefined;
  }

  if (programIds.has(String(program.id)) || programIds.has(program.slug)) {
    return program;
  }

  return undefined;
}

export async function upsertHostVillage(village: Village): Promise<Village> {
  const insertValue = mapVillageToInsert(village);
  const now = new Date();

  if (isUuid(village.id)) {
    const [updatedRow] = await getDb()
      .update(villagesTable)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(villagesTable.id, village.id))
      .returning();

    if (updatedRow) return mapVillageRowToVillage(updatedRow);
  }

  const [row] = await getDb()
    .insert(villagesTable)
    .values(insertValue)
    .onConflictDoUpdate({
      target: villagesTable.slug,
      set: { ...insertValue, updatedAt: now },
    })
    .returning();

  return mapVillageRowToVillage(row);
}

export function normalizeHostVillage(input: unknown): Village {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Village payload is required.");
  }

  const value = input as Record<string, unknown>;
  const name = asString(value.name) || "새 마을";
  const slug = createVillageSlug(asString(value.slug) || name);
  const now = new Date().toISOString();

  return {
    id: asString(value.id) || `village-${Date.now()}`,
    slug,
    name,
    region: asString(value.region) || "전국",
    city: asString(value.city) || "로컬",
    tagline: asString(value.tagline) || `${name} 공식 홈`,
    summary: asString(value.summary) || `${name}의 프로그램과 소식을 모아 보여줍니다.`,
    description:
      asString(value.description) ||
      `${name} 운영자가 신청, 공지, 후기, 보고서 자료를 한곳에서 관리할 수 있는 마을 페이지입니다.`,
    heroImage: asString(value.heroImage) || fallbackImage,
    logoText: asString(value.logoText) || name.slice(0, 2).toUpperCase(),
    brandColor: normalizeColor(asString(value.brandColor), "#0f766e"),
    accentColor: normalizeColor(asString(value.accentColor), "#f59e0b"),
    instagramUrl: asOptionalString(value.instagramUrl),
    kakaoUrl: asOptionalString(value.kakaoUrl),
    contactEmail: asOptionalString(value.contactEmail),
    contactPhone: asOptionalString(value.contactPhone),
    address: asOptionalString(value.address),
    programIds: normalizeProgramIds(value.programIds),
    links: normalizeLinks(value.links),
    sections: normalizeSections(value.sections, name),
    published: Boolean(value.published),
    updatedAt: asString(value.updatedAt) || now,
  };
}

export function createVillageSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return slug || `village-${Date.now().toString(36)}`;
}

function mapVillageToInsert(village: Village): VillageInsert {
  return {
    slug: createVillageSlug(village.slug),
    name: village.name.trim() || "NUVIO village",
    region: village.region.trim() || "전국",
    city: village.city.trim() || "로컬",
    tagline: village.tagline.trim() || `${village.name} 공식 홈`,
    summary: village.summary.trim() || village.tagline.trim(),
    description:
      village.description.trim() || village.summary.trim() || village.tagline.trim(),
    heroImageUrl: village.heroImage.trim() || fallbackImage,
    logoText: village.logoText?.trim() || null,
    brandColor: normalizeColor(village.brandColor, "#0f766e"),
    accentColor: normalizeColor(village.accentColor, "#f59e0b"),
    instagramUrl: village.instagramUrl?.trim() || null,
    kakaoUrl: village.kakaoUrl?.trim() || null,
    contactEmail: village.contactEmail?.trim() || null,
    contactPhone: village.contactPhone?.trim() || null,
    address: village.address?.trim() || null,
    programIds: village.programIds,
    links: village.links,
    sections: village.sections,
    publishedAt: village.published ? new Date() : null,
  };
}

function mapVillageRowToVillage(row: VillageRow): Village {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    city: row.city,
    tagline: row.tagline,
    summary: row.summary,
    description: row.description,
    heroImage: row.heroImageUrl,
    logoText: row.logoText ?? undefined,
    brandColor: row.brandColor,
    accentColor: row.accentColor,
    instagramUrl: row.instagramUrl ?? undefined,
    kakaoUrl: row.kakaoUrl ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    address: row.address ?? undefined,
    programIds: normalizeProgramIds(row.programIds),
    links: normalizeLinks(row.links),
    sections: normalizeSections(row.sections, row.name),
    published: Boolean(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mergeVillages(databaseVillages: Village[], fallbackVillages: Village[]) {
  const seen = new Set<string>();
  const merged: Village[] = [];

  for (const village of [...databaseVillages, ...fallbackVillages]) {
    if (seen.has(village.slug)) continue;
    seen.add(village.slug);
    merged.push(village);
  }

  return merged;
}

function normalizeProgramIds(value: unknown): Array<number | string> {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "number" ? item : String(item).trim()))
    .filter((item) => item !== "");
}

function normalizeLinks(value: unknown): VillageLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
      const record = item as Record<string, unknown>;
      const label = asString(record.label);
      const url = asString(record.url);
      if (!label || !url) return undefined;

      return {
        id: asString(record.id) || `link-${index + 1}`,
        label,
        url,
        type: asVillageLinkType(record.type),
      };
    })
    .filter((item): item is VillageLink => Boolean(item));
}

function normalizeSections(value: unknown, villageName: string): VillageSection[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        id: "story",
        type: "story",
        title: `${villageName} 소개`,
        body: `${villageName}의 프로그램, 공지, 신청 흐름을 한곳에서 관리합니다.`,
        items: ["프로그램 소개", "신청자 안내", "후기 수집"],
      },
    ];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      const body = asString(record.body);
      if (!title || !body) return undefined;

      return {
        id: asString(record.id) || `section-${index + 1}`,
        type: asVillageSectionType(record.type),
        title,
        body,
        items: normalizeStringArray(record.items),
      };
    })
    .filter((item): item is VillageSection => Boolean(item));
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asVillageLinkType(value: unknown): VillageLink["type"] {
  const text = asString(value);
  return ["instagram", "kakao", "website", "map", "notice"].includes(text)
    ? (text as VillageLink["type"])
    : "website";
}

function asVillageSectionType(value: unknown): VillageSection["type"] {
  const text = asString(value);
  return ["story", "programs", "stay", "community", "notice", "faq"].includes(text)
    ? (text as VillageSection["type"])
    : "story";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text || undefined;
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/iu.test(value) ? value : fallback;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const fallbackImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82";
