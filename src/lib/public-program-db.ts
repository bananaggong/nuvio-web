import { desc, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable } from "@/db/schema";
import { getProgramById, programs as seedPrograms } from "@/lib/data";
import type { Program } from "@/lib/types";

type ProgramRow = typeof programsTable.$inferSelect;

export async function listPublicPrograms(): Promise<Program[]> {
  try {
    const rows = await getDb()
      .select()
      .from(programsTable)
      .where(isNotNull(programsTable.publishedAt))
      .orderBy(desc(programsTable.updatedAt))
      .limit(500);

    return mergePrograms(rows.map(mapProgramRowToProgram), seedPrograms);
  } catch {
    return seedPrograms;
  }
}

export async function getPublicProgramByIdentifier(
  identifier: string,
): Promise<Program | undefined> {
  const key = identifier.trim();
  if (!key) return undefined;

  try {
    const rows = await getDb()
      .select()
      .from(programsTable)
      .where(isNotNull(programsTable.publishedAt))
      .orderBy(desc(programsTable.updatedAt))
      .limit(500);
    const numericId = Number(key);
    const row = rows.find((item) => {
      if (Number.isInteger(numericId) && item.legacyId === numericId) return true;
      return item.id === key || item.slug === key;
    });

    if (row) return mapProgramRowToProgram(row);
  } catch {
    const staticProgram = getStaticProgram(key);
    if (staticProgram) return staticProgram;
  }

  return getStaticProgram(key);
}

function mergePrograms(databasePrograms: Program[], staticPrograms: Program[]): Program[] {
  const seen = new Set<string>();
  const merged: Program[] = [];

  for (const program of [...databasePrograms, ...staticPrograms]) {
    const key = String(program.id);
    const slugKey = program.slug ? `slug:${program.slug}` : "";
    if (seen.has(key) || (slugKey && seen.has(slugKey))) continue;

    seen.add(key);
    if (slugKey) seen.add(slugKey);
    merged.push(program);
  }

  return merged;
}

function getStaticProgram(identifier: string): Program | undefined {
  const numericId = Number(identifier);
  if (Number.isInteger(numericId)) return getProgramById(numericId);
  return seedPrograms.find((program) => program.slug === identifier);
}

function mapProgramRowToProgram(row: ProgramRow): Program {
  const image = row.imageUrl || fallbackImage;
  const hashtags = normalizeList(row.hashtags);
  const categories = row.categories.length > 0 ? row.categories : [row.theme];

  return {
    id: row.legacyId ?? row.slug,
    title: row.title,
    slug: row.slug,
    region: row.region,
    city: row.city,
    isGlobal: row.isGlobal,
    summary: row.summary,
    description: row.description,
    theme: row.theme,
    categories,
    hashtags,
    periodKey: row.periodKey,
    activityStart: normalizeDate(row.activityStart),
    activityEnd: normalizeDate(row.activityEnd),
    recruitStart: normalizeDate(row.recruitStart),
    recruitEnd: normalizeDate(row.recruitEnd),
    target: row.target,
    capacity: row.capacity,
    announcement: row.announcement,
    subsidyLabel: row.subsidyLabel,
    subsidyAmount: row.subsidyAmount,
    fee: row.fee,
    applicants: row.applicants,
    status: row.status,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    applyUrl: row.applyUrl,
    phone: row.phone,
    image,
    gallery: normalizeList(row.gallery, [image]),
    badges: normalizeList(row.badges, hashtags.slice(0, 4)),
    body: normalizeList(row.body, [row.description || row.summary]),
  };
}

function normalizeDate(value: string | Date): string {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function normalizeList(value: string[], fallback: string[] = []): string[] {
  const normalized = value.map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80";
