import { and, desc, eq, isNotNull, notInArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable } from "@/db/schema";
import { getCrawledProgramByIdentifier } from "@/lib/crawled-programs";
import { getProgramById, programs as seedPrograms } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import {
  decodeHostProgramMeta,
  stripHostProgramMeta,
} from "@/lib/host-program-studio";
import type { Program } from "@/lib/types";

type ProgramRow = typeof programsTable.$inferSelect;

export async function listPublicPrograms(): Promise<Program[]> {
  let databasePrograms: Program[] = [];

  try {
    const rows = await getDb()
      .select()
      .from(programsTable)
      .where(
        and(
          isNotNull(programsTable.publishedAt),
          notInArray(programsTable.status, ["closed", "earlyClosed"]),
        ),
      )
      .orderBy(desc(programsTable.updatedAt))
      .limit(500);

    databasePrograms = rows.map(mapProgramRowToProgram);
  } catch {
    databasePrograms = [];
  }

  const demoPrograms = isDemoModeEnabled()
    ? seedPrograms.map((program) => ({ ...program, dataSource: "seed" as const }))
    : [];

  return mergePrograms(databasePrograms, demoPrograms);
}

export async function getPublicProgramByIdentifier(
  identifier: string,
): Promise<Program | undefined> {
  const key = identifier.trim();
  if (!key) return undefined;

  try {
    const numericId = Number(key);
    const identifierConditions: SQL[] = [eq(programsTable.slug, key)];
    if (isUuid(key)) identifierConditions.push(eq(programsTable.id, key));
    if (Number.isInteger(numericId)) {
      identifierConditions.push(eq(programsTable.legacyId, numericId));
    }

    const [row] = await getDb()
      .select()
      .from(programsTable)
      .where(and(isNotNull(programsTable.publishedAt), or(...identifierConditions)))
      .limit(1);

    if (row) return mapProgramRowToProgram(row);
  } catch {
    // Continue to crawled and optional demo fallback.
  }

  try {
    const crawledProgram = await getCrawledProgramByIdentifier(key);
    if (crawledProgram) return crawledProgram;
  } catch {
    // Continue to optional demo fallback.
  }

  if (!isDemoModeEnabled()) return undefined;

  const staticProgram = getStaticProgram(key);
  return staticProgram ? { ...staticProgram, dataSource: "seed" } : undefined;
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

function mapProgramRowToProgram(row: ProgramRow): Program {
  const image = row.imageUrl || fallbackImage;
  const hashtags = normalizeList(row.hashtags);
  const categories = row.categories.length > 0 ? row.categories : [row.theme];
  const meta = decodeHostProgramMeta(row.body);

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
    contactEmail: row.contactEmail ?? undefined,
    image,
    gallery: normalizeList(row.gallery, [image]),
    badges: normalizeList(row.badges, hashtags.slice(0, 4)),
    body: normalizeList(stripHostProgramMeta(row.body), [
      row.description || row.summary,
    ]),
    itineraryDays: meta.itineraryDays,
    placeInfo: meta.placeInfo,
    guideInfo: meta.guideInfo,
    dataSource: "database",
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
