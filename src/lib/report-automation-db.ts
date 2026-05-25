import { and, desc, eq } from "drizzle-orm";
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
} = {}): Promise<ReportProject[]> {
  let query = getDb()
    .select()
    .from(reportProjects)
    .$dynamic();

  if (options.ownerId) {
    query = query.where(eq(reportProjects.createdBy, options.ownerId));
  }

  const rows = await query.orderBy(desc(reportProjects.updatedAt)).limit(200);

  return rows.map(mapReportRowToProject);
}

export async function upsertReportProject(
  project: ReportProject,
  options: { ownerId?: string; restrictToOwner?: boolean } = {},
): Promise<ReportProject> {
  const insertValue = mapProjectToInsert(project, options.ownerId);
  const now = new Date();

  if (isUuid(project.id)) {
    const [updatedRow] = await getDb()
      .update(reportProjects)
      .set({ ...insertValue, updatedAt: now })
      .where(
        options.ownerId && options.restrictToOwner
          ? and(
              eq(reportProjects.id, project.id),
              eq(reportProjects.createdBy, options.ownerId),
            )
          : eq(reportProjects.id, project.id),
      )
      .returning();

    if (updatedRow) return mapReportRowToProject(updatedRow);

    const [createdRow] = await getDb()
      .insert(reportProjects)
      .values({ ...insertValue, id: project.id })
      .returning();

    return mapReportRowToProject(createdRow);
  }

  const [row] = await getDb()
    .insert(reportProjects)
    .values(insertValue)
    .returning();

  return mapReportRowToProject(row);
}

export function normalizeReportProject(input: unknown): ReportProject {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("운영 폴더 정보가 필요합니다.");
  }

  return normalizeReportProjectModel(input);
}

function mapProjectToInsert(
  project: ReportProject,
  ownerId?: string,
): ReportProjectInsert {
  return {
    createdBy: ownerId,
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
    villageName: asString(payload.villageName) || row.organizationName,
  });
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
