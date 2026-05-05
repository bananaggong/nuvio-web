import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable } from "@/db/schema";
import type { Program } from "@/lib/types";

type ProgramInsert = typeof programsTable.$inferInsert;
type ProgramRow = typeof programsTable.$inferSelect;

export type ProgramRecordSummary = Pick<
  ProgramRow,
  "id" | "legacyId" | "slug" | "title" | "publishedAt"
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

  const numericId = Number(key);
  const rows = await getDb()
    .select({
      id: programsTable.id,
      legacyId: programsTable.legacyId,
      slug: programsTable.slug,
      title: programsTable.title,
      publishedAt: programsTable.publishedAt,
    })
    .from(programsTable)
    .limit(500);

  return rows.find((row) => {
    if (Number.isInteger(numericId) && row.legacyId === numericId) return true;
    return row.id === key || row.slug === key;
  });
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
    imageUrl: program.image,
    gallery: program.gallery,
    badges: program.badges,
    body: program.body,
    publishedAt: new Date(),
  };
}
