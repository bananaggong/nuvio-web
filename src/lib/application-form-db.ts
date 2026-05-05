import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { programApplicationForms } from "@/db/schema";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import type {
  ApplicationFieldType,
  ApplicationFormField,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import type { Program } from "@/lib/types";

type FormInsert = typeof programApplicationForms.$inferInsert;
type FormRow = typeof programApplicationForms.$inferSelect;

export async function listApplicationFormTemplatesFromDb(): Promise<
  ApplicationFormTemplate[]
> {
  const rows = await getDb()
    .select()
    .from(programApplicationForms)
    .orderBy(desc(programApplicationForms.updatedAt))
    .limit(200);

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
    const row = rows.find((item) => {
      if (programRecord?.id && item.programId === programRecord.id) return true;
      return normalizeText(item.programTitle ?? "") === normalizedTitle;
    });

    return row ? mapFormRowToTemplate(row) : undefined;
  } catch {
    return undefined;
  }
}

export async function upsertApplicationFormTemplate(
  template: ApplicationFormTemplate,
): Promise<ApplicationFormTemplate> {
  const insertValue = mapTemplateToInsert(template);
  const now = new Date();

  if (isUuid(template.id)) {
    const [updatedRow] = await getDb()
      .update(programApplicationForms)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(programApplicationForms.id, template.id))
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

  return {
    id: asString(value.id) || `form-${Date.now()}`,
    name: asString(value.name) || "신청서",
    description: asString(value.description),
    programTitle: asString(value.programTitle),
    fields: normalizeFields(value.fields),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

function mapTemplateToInsert(template: ApplicationFormTemplate): FormInsert {
  return {
    title: template.name.trim() || "Application form",
    description: template.description.trim() || null,
    programTitle: template.programTitle.trim() || null,
    fields: template.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      helper: field.helper ?? "",
      options: field.options ?? [],
    })),
  };
}

function mapFormRowToTemplate(row: FormRow): ApplicationFormTemplate {
  return {
    id: row.id,
    name: row.title,
    description: row.description ?? "",
    programTitle: row.programTitle ?? "",
    fields: normalizeFields(row.fields),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeFields(value: unknown): ApplicationFormField[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const field = item as Record<string, unknown>;

      return {
        id: asString(field.id) || `field-${index}-${Date.now()}`,
        label: asString(field.label) || "질문",
        type: asFieldType(field.type),
        required: Boolean(field.required),
        helper: asString(field.helper),
        options: asStringArray(field.options),
      };
    });
}

function asFieldType(value: unknown): ApplicationFieldType {
  const text = asString(value);
  return fieldTypeValues.includes(text as ApplicationFieldType)
    ? (text as ApplicationFieldType)
    : "text";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const fieldTypeValues: ApplicationFieldType[] = [
  "text",
  "textarea",
  "select",
  "checkbox",
];
