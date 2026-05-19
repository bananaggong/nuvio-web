import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable, savedPrograms } from "@/db/schema";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export type ProgramStateKind = "bookmarked" | "alertEnabled" | "trackingEnabled";

export type UserProgramStateMaps = {
  alerts: Record<string, boolean>;
  bookmarks: Record<string, boolean>;
  tracks: Record<string, boolean>;
};

type SavedProgramRow = typeof savedPrograms.$inferSelect;
type ProgramRow = Pick<
  typeof programsTable.$inferSelect,
  "id" | "legacyId" | "slug"
>;

export async function listUserProgramState(
  userId: string,
): Promise<UserProgramStateMaps> {
  const rows = await getDb()
    .select({
      savedProgram: savedPrograms,
      program: {
        id: programsTable.id,
        legacyId: programsTable.legacyId,
        slug: programsTable.slug,
      },
    })
    .from(savedPrograms)
    .innerJoin(programsTable, eq(savedPrograms.programId, programsTable.id))
    .where(eq(savedPrograms.userId, userId))
    .orderBy(desc(savedPrograms.updatedAt))
    .limit(500);

  return rows.reduce<UserProgramStateMaps>(
    (maps, row) => {
      for (const key of getProgramKeys(row.program)) {
        if (row.savedProgram.bookmarked) maps.bookmarks[key] = true;
        if (row.savedProgram.alertEnabled) maps.alerts[key] = true;
        if (row.savedProgram.trackingEnabled) maps.tracks[key] = true;
      }
      return maps;
    },
    { alerts: {}, bookmarks: {}, tracks: {} },
  );
}

export async function updateUserProgramState(
  userId: string,
  programIdentifier: string,
  kind: ProgramStateKind,
  enabled: boolean,
): Promise<UserProgramStateMaps> {
  const program = await getProgramRecordByIdentifier(programIdentifier);
  if (!program) {
    throw new Error("Program was not found.");
  }

  const [current] = await getDb()
    .select()
    .from(savedPrograms)
    .where(
      and(
        eq(savedPrograms.userId, userId),
        eq(savedPrograms.programId, program.id),
      ),
    )
    .limit(1);

  const next = {
    bookmarked: current?.bookmarked ?? false,
    alertEnabled: current?.alertEnabled ?? false,
    trackingEnabled: current?.trackingEnabled ?? false,
    [kind]: enabled,
  };

  if (!next.bookmarked && !next.alertEnabled && !next.trackingEnabled) {
    await getDb()
      .delete(savedPrograms)
      .where(
        and(
          eq(savedPrograms.userId, userId),
          eq(savedPrograms.programId, program.id),
        ),
      );
    return listUserProgramState(userId);
  }

  const value = {
    alertEnabled: next.alertEnabled,
    bookmarked: next.bookmarked,
    programId: program.id,
    trackingEnabled: next.trackingEnabled,
    userId,
  } satisfies Partial<SavedProgramRow> & {
    programId: string;
    userId: string;
  };

  await getDb()
    .insert(savedPrograms)
    .values(value)
    .onConflictDoUpdate({
      target: [savedPrograms.userId, savedPrograms.programId],
      set: {
        alertEnabled: value.alertEnabled,
        bookmarked: value.bookmarked,
        trackingEnabled: value.trackingEnabled,
        updatedAt: new Date(),
      },
    });

  return listUserProgramState(userId);
}

export function normalizeProgramStateKind(value: unknown): ProgramStateKind {
  if (
    value === "bookmarked" ||
    value === "alertEnabled" ||
    value === "trackingEnabled"
  ) {
    return value;
  }

  throw new Error("Unsupported program state kind.");
}

function getProgramKeys(program: ProgramRow): string[] {
  return [
    program.id,
    program.legacyId ? String(program.legacyId) : "",
    program.slug,
  ].filter(Boolean);
}
