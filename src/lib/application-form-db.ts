import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programApplicationForms } from "@/db/schema";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import type {
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  blocksToFields,
  normalizeApplicationFormBlocks,
  normalizeApplicationFormFields,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import type { Program } from "@/lib/types";

type FormInsert = typeof programApplicationForms.$inferInsert;
type FormRow = typeof programApplicationForms.$inferSelect;

export async function listApplicationFormTemplatesFromDb(options: {
  ownerId?: string;
} = {}): Promise<ApplicationFormTemplate[]> {
  let query = getDb()
    .select()
    .from(programApplicationForms)
    .$dynamic();

  if (options.ownerId) {
    query = query.where(eq(programApplicationForms.createdBy, options.ownerId));
  }

  const rows = await query.orderBy(desc(programApplicationForms.updatedAt)).limit(200);

  return rows.map(mapFormRowToTemplate);
}

export async function getApplicationFormTemplateForProgram(
  program: Program,
): Promise<ApplicationFormTemplate | undefined> {
  try {
    const rows = await getDb()
      .select()
      .from(programApplicationForms)
      .orderBy(desc(programApplicationForms.updatedAt))
      .limit(200);
    const programRecord = await getProgramRecordByIdentifier(program.id);
    const normalizedTitle = normalizeText(program.title);
    const row =
      rows.find((item) =>
        Boolean(programRecord?.id && item.programId === programRecord.id),
      ) ??
      rows.find(
        (item) => normalizeText(item.programTitle ?? "") === normalizedTitle,
      );

    return row ? mapFormRowToTemplate(row) : undefined;
  } catch {
    return undefined;
  }
}

export async function upsertApplicationFormTemplate(
  template: ApplicationFormTemplate,
  options: { ownerId?: string; restrictToOwner?: boolean } = {},
): Promise<ApplicationFormTemplate> {
  const insertValue = mapTemplateToInsert(template, options.ownerId);
  const now = new Date();

  if (isUuid(template.id)) {
    const [updatedRow] = await getDb()
      .update(programApplicationForms)
      .set({ ...insertValue, updatedAt: now })
      .where(
        options.ownerId && options.restrictToOwner
          ? and(
              eq(programApplicationForms.id, template.id),
              eq(programApplicationForms.createdBy, options.ownerId),
            )
          : eq(programApplicationForms.id, template.id),
      )
      .returning();

    if (updatedRow) return mapFormRowToTemplate(updatedRow);

    const [createdRow] = await getDb()
      .insert(programApplicationForms)
      .values({ ...insertValue, id: template.id })
      .returning();

    return mapFormRowToTemplate(createdRow);
  }

  const [row] = await getDb()
    .insert(programApplicationForms)
    .values(insertValue)
    .returning();

  return mapFormRowToTemplate(row);
}

export function normalizeApplicationFormTemplate(
  input: unknown,
): ApplicationFormTemplate {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Application form payload is required.");
  }

  const value = input as Record<string, unknown>;

  return normalizeApplicationFormTemplateShape({
    id: asString(value.id) || `form-${Date.now()}`,
    name: asString(value.name) || "신청서",
    description: asString(value.description),
    programId: asString(value.programId),
    programTitle: asString(value.programTitle),
    blocks: normalizeApplicationFormBlocks(value.blocks ?? value.fields),
    fields: normalizeApplicationFormFields(value.fields),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  });
}

function mapTemplateToInsert(
  template: ApplicationFormTemplate,
  ownerId?: string,
): FormInsert {
  const normalizedTemplate = normalizeApplicationFormTemplateShape(template);

  return {
    createdBy: ownerId,
    title: normalizedTemplate.name.trim() || "Application form",
    description: normalizedTemplate.description.trim() || null,
    programId: isUuid(normalizedTemplate.programId ?? "")
      ? normalizedTemplate.programId
      : null,
    programTitle: normalizedTemplate.programTitle.trim() || null,
    fields: normalizedTemplate.blocks.map((block) => ({
      body: block.body ?? "",
      branches: block.branches ?? [],
      helper: block.helper ?? "",
      id: block.id,
      label: block.label,
      options: block.options ?? [],
      required: block.required,
      type: block.type,
    })),
  };
}

function mapFormRowToTemplate(row: FormRow): ApplicationFormTemplate {
  const blocks = normalizeApplicationFormBlocks(row.fields);
  const fields = normalizeApplicationFormFields(row.fields);

  return normalizeApplicationFormTemplateShape({
    blocks,
    id: row.id,
    name: row.title,
    description: row.description ?? "",
    programId: row.programId ?? "",
    programTitle: row.programTitle ?? "",
    fields: blocks.length > 0 ? blocksToFields(blocks) : fields,
    updatedAt: row.updatedAt.toISOString(),
  });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
