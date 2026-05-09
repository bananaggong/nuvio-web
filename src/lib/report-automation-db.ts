import { desc, eq } from "drizzle-orm";
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

export async function listReportProjectsFromDb(): Promise<ReportProject[]> {
  const rows = await getDb()
    .select()
    .from(reportProjects)
    .orderBy(desc(reportProjects.updatedAt))
    .limit(200);

  return rows.map(mapReportRowToProject);
}

export async function upsertReportProject(
  project: ReportProject,
): Promise<ReportProject> {
  const insertValue = mapProjectToInsert(project);
  const now = new Date();

  if (isUuid(project.id)) {
    const [updatedRow] = await getDb()
      .update(reportProjects)
      .set({ ...insertValue, updatedAt: now })
      .where(eq(reportProjects.id, project.id))
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
    throw new Error("Operation project payload is required.");
  }

  return normalizeReportProjectModel(input);
}

function mapProjectToInsert(project: ReportProject): ReportProjectInsert {
  return {
    name: project.title.trim() || "Operation project",
    organizationName:
      project.villageName.trim() || project.agencyName.trim() || "NUVIO",
    reportType: "operation-closeout",
    status: mapReportStatusToDatabase(project.status),
    schema: {
      activityEvents: project.activityEvents,
      agencyName: project.agencyName,
      budgetCategories: project.budgetCategories,
      connectedProgramTitles: project.connectedProgramTitles,
      evidenceRules: project.evidenceRules,
      expenseEvents: project.expenseEvents,
      manualFields: project.manualFields,
      ownerName: project.ownerName,
      periodLabel: project.periodLabel,
      programTitle: project.programTitle,
      sections: project.sections,
      title: project.title,
      villageName: project.villageName,
    },
  };
}

function mapReportRowToProject(row: ReportProjectRow): ReportProject {
  const payload = normalizeSchema(row.schema);

  return normalizeReportProjectModel({
    ...payload,
    agencyName: asString(payload.agencyName) || row.organizationName,
    id: row.id,
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
