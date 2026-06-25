import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programs as programsTable, savedPrograms } from "@/db/schema";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export type ProgramStateKind = "bookmarked" | "alertEnabled" | "trackingEnabled";

export type UserProgramStateDetail = {
  bookmarkedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserProgramStateMaps = {
  alerts: Record<string, boolean>;
  bookmarkDetails: Record<string, UserProgramStateDetail>;
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
        if (row.savedProgram.bookmarked) {
          maps.bookmarks[key] = true;
          maps.bookmarkDetails[key] = {
            bookmarkedAt:
              row.savedProgram.bookmarkedAt?.toISOString() ??
              row.savedProgram.updatedAt?.toISOString() ??
              row.savedProgram.createdAt.toISOString(),
            createdAt: row.savedProgram.createdAt.toISOString(),
            updatedAt: row.savedProgram.updatedAt.toISOString(),
          };
        }
        if (row.savedProgram.alertEnabled) maps.alerts[key] = true;
        if (row.savedProgram.trackingEnabled) maps.tracks[key] = true;
      }
      return maps;
    },
    { alerts: {}, bookmarkDetails: {}, bookmarks: {}, tracks: {} },
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

  await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`user-program-state:${userId}:${program.id}`}))`,
    );

    const [current] = await tx
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
    const now = new Date();
    const nextBookmarkedAt = next.bookmarked
      ? kind === "bookmarked" && enabled
        ? now
        : current?.bookmarkedAt ?? current?.updatedAt ?? now
      : null;

    if (!next.bookmarked && !next.alertEnabled && !next.trackingEnabled) {
      await tx
        .delete(savedPrograms)
        .where(
          and(
            eq(savedPrograms.userId, userId),
            eq(savedPrograms.programId, program.id),
          ),
        );
      return;
    }

    const value = {
      alertEnabled: next.alertEnabled,
      bookmarkedAt: nextBookmarkedAt,
      bookmarked: next.bookmarked,
      programId: program.id,
      trackingEnabled: next.trackingEnabled,
      userId,
    } satisfies Partial<SavedProgramRow> & {
      programId: string;
      userId: string;
    };

    await tx
      .insert(savedPrograms)
      .values(value)
      .onConflictDoUpdate({
        target: [savedPrograms.userId, savedPrograms.programId],
        set: {
          alertEnabled: value.alertEnabled,
          bookmarkedAt: value.bookmarkedAt,
          bookmarked: value.bookmarked,
          trackingEnabled: value.trackingEnabled,
          updatedAt: new Date(),
        },
      });
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
