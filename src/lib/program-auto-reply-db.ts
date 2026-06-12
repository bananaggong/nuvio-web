import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programAutoReplies } from "@/db/schema";
import {
  createDefaultProgramAutoReplyConfig,
  normalizeProgramAutoReplyConfig,
  normalizeProgramAutoReplyItems,
  type ProgramAutoReplyConfig,
  type ProgramAutoReplyItem,
} from "@/lib/program-auto-replies";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

type AutoReplyInsert = typeof programAutoReplies.$inferInsert;
type AutoReplyRow = typeof programAutoReplies.$inferSelect;

export async function getProgramAutoReplyConfigByIdentifier(
  identifier: string,
): Promise<ProgramAutoReplyConfig | null> {
  const program = await getProgramRecordByIdentifier(identifier);
  if (!program) return null;

  return getProgramAutoReplyConfigByProgramId(program.id);
}

export async function getProgramAutoReplyConfigByProgramId(
  programId: string,
): Promise<ProgramAutoReplyConfig | null> {
  if (!isUuid(programId)) return null;

  const [row] = await getDb()
    .select()
    .from(programAutoReplies)
    .where(eq(programAutoReplies.programId, programId))
    .limit(1);

  return row ? mapAutoReplyRowToConfig(row) : null;
}

export async function upsertProgramAutoReplyConfig(input: {
  createdBy?: string;
  enabled: boolean;
  greeting: string;
  items: ProgramAutoReplyItem[];
  programId: string;
  villageId?: string;
}): Promise<ProgramAutoReplyConfig> {
  const fallback = createDefaultProgramAutoReplyConfig(input.programId);
  const now = new Date();
  const insertValue: AutoReplyInsert = {
    createdBy: isUuid(input.createdBy ?? "") ? input.createdBy : null,
    enabled: input.enabled,
    greeting: input.greeting.trim() || fallback.greeting,
    items: normalizeProgramAutoReplyItems(input.items).map((item) => ({
      enabled: item.enabled,
      id: item.id,
      label: item.label,
      response: item.response,
    })),
    programId: input.programId,
    updatedAt: now,
    villageId: isUuid(input.villageId ?? "") ? input.villageId : null,
  };

  const [row] = await getDb()
    .insert(programAutoReplies)
    .values(insertValue)
    .onConflictDoUpdate({
      target: programAutoReplies.programId,
      set: {
        enabled: insertValue.enabled,
        greeting: insertValue.greeting,
        items: insertValue.items,
        updatedAt: now,
        villageId: insertValue.villageId,
      },
    })
    .returning();

  return mapAutoReplyRowToConfig(row);
}

function mapAutoReplyRowToConfig(row: AutoReplyRow): ProgramAutoReplyConfig {
  return normalizeProgramAutoReplyConfig({
    enabled: row.enabled,
    greeting: row.greeting,
    id: row.id,
    items: row.items,
    programId: row.programId,
    updatedAt: row.updatedAt.toISOString(),
    villageId: row.villageId ?? "",
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
