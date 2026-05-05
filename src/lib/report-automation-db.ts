import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reportProjects } from "@/db/schema";
import {
  reportSectionOrder,
  type ReportProject,
  type ReportProjectStatus,
  type ReportSectionId,
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
    throw new Error("Report project payload is required.");
  }

  const value = input as Record<string, unknown>;

  return {
    id: asString(value.id) || `report-${Date.now()}`,
    title: asString(value.title) || "결과보고서",
    agencyName: asString(value.agencyName),
    programTitle: asString(value.programTitle) || "전체 프로그램",
    periodLabel: asString(value.periodLabel),
    ownerName: asString(value.ownerName),
    status: asReportStatus(value.status),
    sections: normalizeSections(value.sections),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

function mapProjectToInsert(project: ReportProject): ReportProjectInsert {
  return {
    name: project.title.trim() || "Report project",
    organizationName: project.agencyName.trim() || "NUVIO",
    reportType: "program-result",
    status: mapReportStatusToDatabase(project.status),
    schema: {
      programTitle: project.programTitle,
      periodLabel: project.periodLabel,
      ownerName: project.ownerName,
      sections: project.sections,
    },
  };
}

function mapReportRowToProject(row: ReportProjectRow): ReportProject {
  const payload = normalizeSchema(row.schema);

  return {
    id: row.id,
    title: row.name,
    agencyName: row.organizationName,
    programTitle: asString(payload.programTitle) || "전체 프로그램",
    periodLabel: asString(payload.periodLabel),
    ownerName: asString(payload.ownerName),
    status: mapDatabaseStatusToReport(row.status),
    sections: normalizeSections(payload.sections),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeSections(value: unknown): ReportSectionId[] {
  if (!Array.isArray(value)) {
    return ["overview", "participants", "payments", "evidence", "risks"];
  }

  const selectedSections = value.filter((item): item is ReportSectionId =>
    reportSectionOrder.includes(item as ReportSectionId),
  );

  return reportSectionOrder.filter((sectionId) =>
    selectedSections.includes(sectionId),
  );
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

function asReportStatus(value: unknown): ReportProjectStatus {
  const text = asString(value);
  return reportStatusValues.includes(text as ReportProjectStatus)
    ? (text as ReportProjectStatus)
    : "draft";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const reportStatusValues: ReportProjectStatus[] = ["draft", "review", "ready"];
