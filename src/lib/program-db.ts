import { eq, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable } from "@/db/schema";
import { parseLegacyProgramIdentifier } from "@/lib/program-identifier";
import type { Program } from "@/lib/types";

type ProgramInsert = typeof programsTable.$inferInsert;
type ProgramRow = typeof programsTable.$inferSelect;

export type ProgramRecordSummary = Pick<
  ProgramRow,
  | "createdBy"
  | "id"
  | "legacyId"
  | "publishedAt"
  | "recruitEnd"
  | "recruitStart"
  | "slug"
  | "status"
  | "title"
  | "villageId"
>;

export async function ensureProgramRecord(program: Program): Promise<string> {
  const insertValue = mapProgramToInsert(program);
  const now = new Date();
  const [row] = await getDb()
    .insert(programsTable)
    .values(insertValue)
    .onConflictDoUpdate({
      target: programsTable.legacyId,
      set: {
        ...insertValue,
        updatedAt: now,
      },
    })
    .returning({ id: programsTable.id });

  return row.id;
}

export async function getProgramRecordIdByLegacyId(
  legacyId: number,
): Promise<string | undefined> {
  const [row] = await getDb()
    .select({ id: programsTable.id })
    .from(programsTable)
    .where(eq(programsTable.legacyId, legacyId))
    .limit(1);

  return row?.id;
}

export async function getProgramRecordByIdentifier(
  identifier: number | string,
): Promise<ProgramRecordSummary | undefined> {
  const key = String(identifier).trim();
  if (!key) return undefined;

  const legacyId = parseLegacyProgramIdentifier(key);
  const conditions: SQL[] = [eq(programsTable.slug, key)];
  if (isUuid(key)) conditions.push(eq(programsTable.id, key));
  if (legacyId !== undefined) {
    conditions.push(eq(programsTable.legacyId, legacyId));
  }

  const [row] = await getDb()
    .select({
      id: programsTable.id,
      legacyId: programsTable.legacyId,
      slug: programsTable.slug,
      title: programsTable.title,
      publishedAt: programsTable.publishedAt,
      recruitEnd: programsTable.recruitEnd,
      recruitStart: programsTable.recruitStart,
      status: programsTable.status,
      villageId: programsTable.villageId,
      createdBy: programsTable.createdBy,
    })
    .from(programsTable)
    .where(or(...conditions))
    .limit(1);

  return row;
}

function mapProgramToInsert(program: Program): ProgramInsert {
  return {
    legacyId: typeof program.id === "number" ? program.id : null,
    title: program.title,
    slug: program.slug,
    region: program.region,
    city: program.city,
    isGlobal: program.isGlobal ?? false,
    summary: program.summary,
    description: program.description,
    theme: program.theme,
    categories: program.categories,
    hashtags: program.hashtags,
    periodKey: program.periodKey,
    activityStart: program.activityStart,
    activityEnd: program.activityEnd,
    recruitStart: program.recruitStart,
    recruitEnd: program.recruitEnd,
    target: program.target,
    capacity: program.capacity,
    announcement: program.announcement,
    subsidyLabel: program.subsidyLabel,
    subsidyAmount: program.subsidyAmount,
    fee: program.fee,
    applicants: program.applicants,
    status: program.status,
    sourceName: program.sourceName,
    sourceUrl: program.sourceUrl,
    applyUrl: program.applyUrl,
    phone: program.phone,
    contactEmail: program.contactEmail ?? null,
    imageUrl: program.image,
    gallery: program.gallery,
    badges: program.badges,
    body: program.body,
    publishedAt: new Date(),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
