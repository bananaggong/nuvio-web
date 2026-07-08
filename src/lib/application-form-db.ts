import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  programApplicationForms,
  programApplications,
  programInquiries,
} from "@/db/schema";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import type {
  ApplicationFormKind,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  asFormKind,
  blocksToFields,
  normalizeApplicationFormBlocks,
  normalizeApplicationFormFields,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import type { Program } from "@/lib/types";

type FormInsert = typeof programApplicationForms.$inferInsert;
type FormRow = typeof programApplicationForms.$inferSelect;

export class ApplicationFormAccessError extends Error {
  constructor() {
    super("You do not have permission to update this application form.");
    this.name = "ApplicationFormAccessError";
  }
}

export class ApplicationFormDeleteBlockedError extends Error {
  constructor(
    message: string,
    public readonly code: "linked-program" | "submitted-records",
  ) {
    super(message);
    this.name = "ApplicationFormDeleteBlockedError";
  }
}

export async function listApplicationFormTemplatesFromDb(options: {
  formKind?: ApplicationFormKind;
  ownerId?: string;
} = {}): Promise<ApplicationFormTemplate[]> {
  let query = getDb()
    .select()
    .from(programApplicationForms)
    .$dynamic();
  const conditions = [];

  if (options.ownerId) {
    conditions.push(eq(programApplicationForms.createdBy, options.ownerId));
  }

  if (options.formKind) {
    conditions.push(eq(programApplicationForms.formKind, options.formKind));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(desc(programApplicationForms.updatedAt)).limit(200);

  return rows.map(mapFormRowToTemplate);
}

export async function getApplicationFormTemplateForProgram(
  program: Program,
): Promise<ApplicationFormTemplate | undefined> {
  try {
    const programRecord = await getProgramRecordByIdentifier(program.id);
    const normalizedTitle = normalizeText(program.title);
    let row: FormRow | undefined;

    if (programRecord?.id) {
      [row] = await getDb()
        .select()
        .from(programApplicationForms)
        .where(
          and(
            eq(programApplicationForms.formKind, "application"),
            eq(programApplicationForms.programId, programRecord.id),
          ),
        )
        .orderBy(desc(programApplicationForms.updatedAt))
        .limit(1);
    }

    if (!row) {
      const rows = await getDb()
        .select()
        .from(programApplicationForms)
        .where(
          and(
            eq(programApplicationForms.formKind, "application"),
            isNull(programApplicationForms.programId),
          ),
        )
        .orderBy(desc(programApplicationForms.updatedAt))
        .limit(200);
      row = rows.find(
        (item) => normalizeText(item.programTitle ?? "") === normalizedTitle,
      );
    }

    return row ? mapFormRowToTemplate(row) : undefined;
  } catch {
    return undefined;
  }
}

export async function getApplicationFormSnapshotForSubmission(input: {
  formId?: string;
  programId: string;
  programTitle: string;
}): Promise<Record<string, unknown> | undefined> {
  try {
    const row = await findApplicationFormRowForSubmission(input);
    if (!row) return undefined;

    return buildApplicationFormSnapshot(mapFormRowToTemplate(row));
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

    if (options.ownerId && options.restrictToOwner) {
      const [existingRow] = await getDb()
        .select({ id: programApplicationForms.id })
        .from(programApplicationForms)
        .where(eq(programApplicationForms.id, template.id))
        .limit(1);

      if (existingRow) throw new ApplicationFormAccessError();
    }

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

export async function deleteApplicationFormTemplate(
  templateId: string,
  options: { ownerId?: string; restrictToOwner?: boolean } = {},
): Promise<boolean> {
  if (!isUuid(templateId)) return false;

  const ownershipCondition =
    options.ownerId && options.restrictToOwner
      ? and(
          eq(programApplicationForms.id, templateId),
          eq(programApplicationForms.createdBy, options.ownerId),
        )
      : eq(programApplicationForms.id, templateId);

  const [formRow] = await getDb()
    .select({
      id: programApplicationForms.id,
      programId: programApplicationForms.programId,
      programTitle: programApplicationForms.programTitle,
    })
    .from(programApplicationForms)
    .where(ownershipCondition)
    .limit(1);

  if (!formRow) {
    if (options.ownerId && options.restrictToOwner) {
      const [existingRow] = await getDb()
        .select({ id: programApplicationForms.id })
        .from(programApplicationForms)
        .where(eq(programApplicationForms.id, templateId))
        .limit(1);

      if (existingRow) throw new ApplicationFormAccessError();
    }

    return false;
  }

  if (formRow.programId || formRow.programTitle?.trim()) {
    throw new ApplicationFormDeleteBlockedError(
      "프로그램에 연결된 신청폼은 삭제할 수 없어요. 먼저 프로그램의 신청폼 연결을 해제하거나 다른 신청폼으로 교체해 주세요.",
      "linked-program",
    );
  }

  const [applicationUsage] = await getDb()
    .select({ value: count() })
    .from(programApplications)
    .where(eq(programApplications.formId, templateId));
  const [inquiryUsage] = await getDb()
    .select({ value: count() })
    .from(programInquiries)
    .where(eq(programInquiries.formId, templateId));
  const submittedRecordCount =
    (applicationUsage?.value ?? 0) + (inquiryUsage?.value ?? 0);

  if (submittedRecordCount > 0) {
    throw new ApplicationFormDeleteBlockedError(
      `이미 접수된 신청/문의 ${submittedRecordCount}건과 연결된 신청폼은 삭제할 수 없어요. 접수 이력 보존을 위해 새 폼을 복제해서 사용해 주세요.`,
      "submitted-records",
    );
  }

  const [deletedRow] = await getDb()
    .delete(programApplicationForms)
    .where(eq(programApplicationForms.id, templateId))
    .returning({ id: programApplicationForms.id });

  return Boolean(deletedRow);
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
    formKind: asFormKind(value.formKind),
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
    formKind: normalizedTemplate.formKind,
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

function buildApplicationFormSnapshot(
  template: ApplicationFormTemplate,
): Record<string, unknown> {
  const normalizedTemplate = normalizeApplicationFormTemplateShape(template);

  return {
    blocks: normalizedTemplate.blocks.map((block) => ({
      body: block.body ?? "",
      branches: block.branches ?? [],
      helper: block.helper ?? "",
      id: block.id,
      imageAlt: block.imageAlt ?? "",
      imageUrl: block.imageUrl ?? "",
      imageWidth: block.imageWidth ?? 100,
      label: block.label,
      options: block.options ?? [],
      required: block.required,
      type: block.type,
    })),
    capturedAt: new Date().toISOString(),
    description: normalizedTemplate.description,
    fields: normalizedTemplate.fields.map((field) => ({
      helper: field.helper ?? "",
      id: field.id,
      label: field.label,
      options: field.options ?? [],
      required: field.required,
      type: field.type,
    })),
    formKind: normalizedTemplate.formKind,
    id: normalizedTemplate.id,
    name: normalizedTemplate.name,
    programId: normalizedTemplate.programId ?? "",
    programTitle: normalizedTemplate.programTitle,
    snapshotVersion: 1,
    sourceFormId: normalizedTemplate.id,
    updatedAt: normalizedTemplate.updatedAt,
  };
}

async function findApplicationFormRowForSubmission(input: {
  formId?: string;
  programId: string;
  programTitle: string;
}): Promise<FormRow | undefined> {
  if (isUuid(input.formId ?? "")) {
    const [row] = await getDb()
      .select()
      .from(programApplicationForms)
      .where(eq(programApplicationForms.id, input.formId!))
      .limit(1);

    if (
      row?.formKind === "application" &&
      (!row.programId || row.programId === input.programId)
    ) {
      return row;
    }
  }

  const [linkedRow] = await getDb()
    .select()
    .from(programApplicationForms)
    .where(
      and(
        eq(programApplicationForms.formKind, "application"),
        eq(programApplicationForms.programId, input.programId),
      ),
    )
    .orderBy(desc(programApplicationForms.updatedAt))
    .limit(1);
  if (linkedRow) return linkedRow;

  const rows = await getDb()
    .select()
    .from(programApplicationForms)
    .where(
      and(
        eq(programApplicationForms.formKind, "application"),
        isNull(programApplicationForms.programId),
      ),
    )
    .orderBy(desc(programApplicationForms.updatedAt))
    .limit(200);
  const normalizedTitle = normalizeText(input.programTitle);

  return rows.find(
    (item) => normalizeText(item.programTitle ?? "") === normalizedTitle,
  );
}

function mapFormRowToTemplate(row: FormRow): ApplicationFormTemplate {
  const blocks = normalizeApplicationFormBlocks(row.fields);
  const fields = normalizeApplicationFormFields(row.fields);

  return normalizeApplicationFormTemplateShape({
    blocks,
    id: row.id,
    name: row.title,
    description: row.description ?? "",
    formKind: asFormKind(row.formKind),
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
