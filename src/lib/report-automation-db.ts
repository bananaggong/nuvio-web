import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reportProjects } from "@/db/schema";
import {
  normalizeReportProjectModel,
  type ReportProject,
  type ReportProjectStatus,
} from "@/lib/report-automation";

type ReportProjectInsert = typeof reportProjects.$inferInsert;
type ReportProjectRow = typeof reportProjects.$inferSelect;
type DatabaseReportStatus = ReportProjectRow["status"];

export async function listReportProjectsFromDb(options: {
  ownerId?: string;
  villageIds?: string[];
} = {}): Promise<ReportProject[]> {
  let query = getDb()
    .select()
    .from(reportProjects)
    .$dynamic();

  if (options.ownerId) {
    query = query.where(eq(reportProjects.createdBy, options.ownerId));
  }
  if (options.villageIds) {
    query = query.where(reportVillageScope(options.villageIds));
  }

  const rows = await query.orderBy(desc(reportProjects.updatedAt)).limit(200);

  return rows.map(mapReportRowToProject);
}

export async function getReportProjectFromDb(
  projectId: string,
  options: { villageIds?: string[] } = {},
): Promise<ReportProject | null> {
  if (!isUuid(projectId)) return null;

  const [row] = await getDb()
    .select()
    .from(reportProjects)
    .where(
      options.villageIds
        ? and(
            eq(reportProjects.id, projectId),
            reportVillageScope(options.villageIds),
          )
        : eq(reportProjects.id, projectId),
    )
    .limit(1);

  return row ? mapReportRowToProject(row) : null;
}

export async function upsertReportProject(
  project: ReportProject,
  options: {
    allowedVillageIds?: string[];
    ownerId?: string;
    villageId: string;
  },
): Promise<ReportProject> {
  if (!isUuid(options.villageId)) {
    throw new Error("Report project requires a valid village workspace.");
  }
  assertVillageScope(options.villageId, options.allowedVillageIds);
  const insertValue = mapProjectToInsert(
    project,
    options.ownerId,
    options.villageId,
  );
  const now = new Date();

  if (isUuid(project.id)) {
    const [updatedRow] = await getDb()
      .update(reportProjects)
      .set({ ...insertValue, updatedAt: now })
      .where(
        options.allowedVillageIds
          ? and(
              eq(reportProjects.id, project.id),
              reportVillageScope(options.allowedVillageIds),
            )
          : eq(reportProjects.id, project.id),
      )
      .returning();

    if (updatedRow) return mapReportRowToProject(updatedRow);

    throw new Error("Report project was not found in the allowed workspace.");
  }

  const [row] = await getDb()
    .insert(reportProjects)
    .values(insertValue)
    .returning();

  return mapReportRowToProject(row);
}

export async function deleteReportProjectFromDb(
  projectId: string,
  options: { villageIds?: string[] } = {},
): Promise<ReportProject | null> {
  if (!isUuid(projectId)) return null;

  const [deletedRow] = await getDb()
    .delete(reportProjects)
    .where(
      options.villageIds
        ? and(
            eq(reportProjects.id, projectId),
            reportVillageScope(options.villageIds),
          )
        : eq(reportProjects.id, projectId),
    )
    .returning();

  return deletedRow ? mapReportRowToProject(deletedRow) : null;
}

export function normalizeReportProject(input: unknown): ReportProject {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("운영 폴더 정보가 필요합니다.");
  }

  return normalizeReportProjectModel(input);
}

function mapProjectToInsert(
  project: ReportProject,
  ownerId: string | undefined,
  villageId: string,
): ReportProjectInsert {
  return {
    createdBy: ownerId,
    villageId,
    programId: isUuid(project.programId ?? "")
      ? project.programId
      : project.connectedProgramIds.find(isUuid) ?? null,
    name: project.title.trim() || "운영 폴더",
    organizationName:
      project.villageName.trim() || project.agencyName.trim() || "누비오",
    reportType: "operation-closeout",
    status: mapReportStatusToDatabase(project.status),
    schema: {
      activityEvents: project.activityEvents,
      agencyName: project.agencyName,
      budgetCategories: project.budgetCategories,
      connectedProgramIds: project.connectedProgramIds,
      connectedProgramTitles: project.connectedProgramTitles,
      evidenceRules: project.evidenceRules,
      expenseEvents: project.expenseEvents,
      imageUrl: project.imageUrl,
      manualFields: project.manualFields,
      ownerName: project.ownerName,
      periodLabel: project.periodLabel,
      programId: project.programId,
      programTitle: project.programTitle,
      sections: project.sections,
      title: project.title,
      villageId: project.villageId,
      villageName: project.villageName,
      villageSlug: project.villageSlug,
    },
  };
}

function mapReportRowToProject(row: ReportProjectRow): ReportProject {
  const payload = normalizeSchema(row.schema);

  return normalizeReportProjectModel({
    ...payload,
    agencyName: asString(payload.agencyName) || row.organizationName,
    id: row.id,
    programId: row.programId ?? asString(payload.programId),
    status: mapDatabaseStatusToReport(row.status),
    title: asString(payload.title) || row.name,
    updatedAt: row.updatedAt.toISOString(),
    villageId: row.villageId ?? asString(payload.villageId),
    villageName: asString(payload.villageName) || row.organizationName,
  });
}

function reportVillageScope(villageIds: string[]) {
  const normalizedIds = villageIds.filter(isUuid);
  return normalizedIds.length > 0
    ? inArray(reportProjects.villageId, normalizedIds)
    : sql`false`;
}

function assertVillageScope(
  villageId: string,
  allowedVillageIds: string[] | undefined,
) {
  if (!allowedVillageIds) return;

  if (!allowedVillageIds.includes(villageId)) {
    throw new Error("Report project is outside the allowed workspace.");
  }
}

function normalizeSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapReportStatusToDatabase(
  status: ReportProjectStatus,
): DatabaseReportStatus {
  if (status === "review") return "collecting";
  return status;
}

function mapDatabaseStatusToReport(status: DatabaseReportStatus): ReportProjectStatus {
  if (status === "collecting") return "review";
  if (status === "submitted") return "ready";
  return status;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
