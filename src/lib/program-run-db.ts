import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programRuns, programs as programsTable } from "@/db/schema";

type ProgramRunInsert = typeof programRuns.$inferInsert;

const defaultRunSlug = "default";

export async function ensureDefaultProgramRunForProgram(
  programId: string,
): Promise<string | undefined> {
  if (!isUuid(programId)) return undefined;

  const [existingRun] = await getDb()
    .select({ id: programRuns.id })
    .from(programRuns)
    .where(
      and(
        eq(programRuns.programId, programId),
        eq(programRuns.slug, defaultRunSlug),
      ),
    )
    .limit(1);

  if (existingRun) return existingRun.id;

  const [program] = await getDb()
    .select({
      id: programsTable.id,
      title: programsTable.title,
      recruitStart: programsTable.recruitStart,
      recruitEnd: programsTable.recruitEnd,
      activityStart: programsTable.activityStart,
      activityEnd: programsTable.activityEnd,
      capacity: programsTable.capacity,
      fee: programsTable.fee,
      status: programsTable.status,
    })
    .from(programsTable)
    .where(eq(programsTable.id, programId))
    .limit(1);

  if (!program) return undefined;

  const insertValue: ProgramRunInsert = {
    activityEnd: normalizeDate(program.activityEnd),
    activityStart: normalizeDate(program.activityStart),
    capacity: program.capacity,
    fee: program.fee,
    metadata: { source: "program-default-run" },
    programId: program.id,
    recruitEnd: normalizeDate(program.recruitEnd),
    recruitStart: normalizeDate(program.recruitStart),
    slug: defaultRunSlug,
    status: program.status,
    title: "Default run",
  };

  const [row] = await getDb()
    .insert(programRuns)
    .values(insertValue)
    .onConflictDoUpdate({
      target: [programRuns.programId, programRuns.slug],
      set: { ...insertValue, updatedAt: new Date() },
    })
    .returning({ id: programRuns.id });

  return row?.id;
}

function normalizeDate(value: string | Date): string {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
