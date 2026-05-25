import {
  summarizeApplications,
  type HostApplication,
} from "@/lib/host-operations";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { ProgramStatus } from "@/lib/types";
import { programs } from "@/lib/data";
import {
  getReportApplications,
  summarizeReportProject,
  type ReportProject,
} from "@/lib/report-automation";

export type HostProjectKind = "operation" | "program";

export type HostProjectOverview = {
  activeCount: number;
  activityCount: number;
  applicationCount: number;
  applications: HostApplication[];
  completedCount: number;
  connectedProgramIds: string[];
  connectedProgramTitles: string[];
  id: string;
  imageUrl: string;
  kind: HostProjectKind;
  missingEvidenceCount: number;
  ownerName: string;
  pendingCount: number;
  periodLabel: string;
  programDrafts: HostProgramDraft[];
  readiness: number;
  reportProject?: ReportProject;
  reviewMissingCount: number;
  signatureMissingCount: number;
  statusLabel: string;
  title: string;
  totalBudget: number;
  updatedAt: string;
  usedAmount: number;
  villageName: string;
};

export type HostProgramOverview = {
  activeCount: number;
  applicationCount: number;
  applications: HostApplication[];
  id: string;
  imageUrl: string;
  missingEvidenceCount: number;
  pendingCount: number;
  readiness: number;
  slug?: string;
  status?: ProgramStatus;
  title: string;
  updatedAt: string;
  villageId?: string;
};

export function buildHostProjectOverviews(
  applications: HostApplication[],
  reportProjects: ReportProject[],
  programDrafts: HostProgramDraft[] = [],
): HostProjectOverview[] {
  const operationProjects = reportProjects.map((project) =>
    buildOperationProjectOverview(project, applications, programDrafts),
  );

  return operationProjects.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function findHostProjectOverview(
  projectId: string,
  applications: HostApplication[],
  reportProjects: ReportProject[],
  programDrafts: HostProgramDraft[] = [],
): HostProjectOverview | undefined {
  return buildHostProjectOverviews(applications, reportProjects, programDrafts).find(
    (project) => project.id === projectId,
  );
}

export function hostProjectPath(projectId: string): string {
  return `/host/projects/${encodeURIComponent(projectId)}`;
}

export function buildHostProgramOverviews(
  project: HostProjectOverview,
  applications: HostApplication[],
): HostProgramOverview[] {
  const draftPrograms = project.programDrafts.map((program) =>
    buildProgramOverviewFromDraft(project, program, applications),
  );
  const draftTitles = new Set(
    draftPrograms.map((program) => normalizeTitle(program.title)),
  );
  const legacyPrograms = resolveProjectProgramTitles(project, applications)
    .filter((title) => !draftTitles.has(normalizeTitle(title)))
    .map((title) => buildProgramOverviewFromTitle(project, title, applications));

  return [...draftPrograms, ...legacyPrograms].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function findHostProgramOverview(
  projectId: string,
  programId: string,
  applications: HostApplication[],
  reportProjects: ReportProject[],
  programDrafts: HostProgramDraft[] = [],
): HostProgramOverview | undefined {
  const project = findHostProjectOverview(
    projectId,
    applications,
    reportProjects,
    programDrafts,
  );
  if (!project) return undefined;

  return buildHostProgramOverviews(project, applications).find(
    (program) =>
      program.id === programId ||
      program.slug === programId ||
      hostProgramId(program.title) === programId,
  );
}

export function hostProgramId(programTitle: string): string {
  const slug = programTitle
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return `program-${slug || stableHash(programTitle)}`;
}

export function hostProgramPath(projectId: string, programId: string): string {
  return `${hostProjectPath(projectId)}/programs/${encodeURIComponent(programId)}`;
}

function buildOperationProjectOverview(
  project: ReportProject,
  applications: HostApplication[],
  programDrafts: HostProgramDraft[],
): HostProjectOverview {
  const scopedApplications = getReportApplications(project, applications);
  const scopedProgramDrafts = resolveProjectProgramDrafts(project, programDrafts);
  const applicationSummary = summarizeApplications(scopedApplications);
  const reportSummary = summarizeReportProject(project, applications);
  const pendingCount = scopedApplications.filter((application) =>
    ["submitted", "screening"].includes(application.status),
  ).length;

  return {
    activeCount:
      applicationSummary.accepted +
      applicationSummary.checkedIn +
      applicationSummary.completed,
    activityCount: reportSummary.activityCount,
    applicationCount: scopedApplications.length,
    applications: scopedApplications,
    completedCount: applicationSummary.completed,
    connectedProgramIds: project.connectedProgramIds,
    connectedProgramTitles: project.connectedProgramTitles,
    id: project.id,
    imageUrl: resolveProjectImage(project, scopedProgramDrafts),
    kind: "operation",
    missingEvidenceCount: reportSummary.missingEvidenceCount,
    ownerName: project.ownerName,
    pendingCount,
    periodLabel: project.periodLabel,
    programDrafts: scopedProgramDrafts,
    readiness: reportSummary.readiness,
    reportProject: project,
    reviewMissingCount: scopedApplications.filter(
      (application) => !application.reviewSubmitted,
    ).length,
    signatureMissingCount: scopedApplications.filter(
      (application) => !application.signatureCompleted,
    ).length,
    statusLabel:
      project.status === "ready"
        ? "마감 준비"
        : project.status === "review"
          ? "수집 중"
          : "설계 중",
    title: project.title,
    totalBudget: reportSummary.totalBudget,
    updatedAt: project.updatedAt,
    usedAmount: reportSummary.usedAmount,
    villageName: project.villageName,
  };
}

function buildProgramOverviewFromDraft(
  project: HostProjectOverview,
  program: HostProgramDraft,
  applications: HostApplication[],
): HostProgramOverview {
  const programApplications = applications.filter(
    (application) =>
      application.programId === program.id ||
      application.programTitle === program.title,
  );
  const applicationSummary = summarizeApplications(programApplications);
  const pendingCount = programApplications.filter((application) =>
    ["submitted", "screening"].includes(application.status),
  ).length;

  return {
    activeCount:
      applicationSummary.accepted +
      applicationSummary.checkedIn +
      applicationSummary.completed,
    applicationCount: programApplications.length,
    applications: programApplications,
    id: program.id,
    imageUrl: program.image || resolveProgramImage(program.title),
    missingEvidenceCount: countMissingEvidence(programApplications),
    pendingCount,
    readiness: applicationSummary.reportReadiness,
    slug: program.slug,
    status: program.status,
    title: program.title,
    updatedAt: programApplications[0]?.submittedAt ?? program.updatedAt ?? project.updatedAt,
    villageId: program.villageId,
  };
}

function buildProgramOverviewFromTitle(
  project: HostProjectOverview,
  title: string,
  applications: HostApplication[],
): HostProgramOverview {
  const programApplications = applications.filter(
    (application) => application.programTitle === title,
  );
  const applicationSummary = summarizeApplications(programApplications);
  const pendingCount = programApplications.filter((application) =>
    ["submitted", "screening"].includes(application.status),
  ).length;

  return {
    activeCount:
      applicationSummary.accepted +
      applicationSummary.checkedIn +
      applicationSummary.completed,
    applicationCount: programApplications.length,
    applications: programApplications,
    id: hostProgramId(title),
    imageUrl: resolveProgramImage(title),
    missingEvidenceCount: countMissingEvidence(programApplications),
    pendingCount,
    readiness: applicationSummary.reportReadiness,
    status: "open",
    title,
    updatedAt: programApplications[0]?.submittedAt ?? project.updatedAt,
  };
}

function countMissingEvidence(applications: HostApplication[]): number {
  return applications.reduce(
    (sum, application) =>
      sum + (application.receiptCount > 0 || application.status === "rejected" ? 0 : 1),
    0,
  );
}

function resolveProjectImage(
  project: ReportProject,
  programDrafts: HostProgramDraft[],
): string {
  if (project.imageUrl) return project.imageUrl;

  const programImage = programDrafts.find((program) => program.image)?.image;
  if (programImage) return programImage;

  const candidates = [
    project.programTitle,
    ...project.connectedProgramTitles,
    project.title,
  ];

  for (const candidate of candidates) {
    const image = resolveProgramImage(candidate, false);
    if (image) return image;
  }

  if (
    project.villageName.includes("전체차") ||
    project.title.includes("보성") ||
    project.title.includes("차")
  ) {
    return "/boseong/hero-illustration.png";
  }

  return programs[0]?.image ?? "/brand/nuvio-logo-combined.svg";
}

function resolveProgramImage(programTitle: string, useFallback = true): string {
  const normalizedTitle = normalizeTitle(programTitle);
  const program = programs.find((item) => {
    const normalizedProgramTitle = normalizeTitle(item.title);
    return (
      normalizedProgramTitle === normalizedTitle ||
      normalizedProgramTitle.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedProgramTitle)
    );
  });

  if (program?.image) return program.image;
  if (!useFallback) return "";

  if (programTitle.includes("차") || programTitle.includes("보성")) {
    return "/boseong/home-tea-time.png";
  }
  return programs[0]?.image ?? "/brand/nuvio-logo-combined.svg";
}

function resolveProjectProgramDrafts(
  project: ReportProject,
  programDrafts: HostProgramDraft[],
): HostProgramDraft[] {
  const connectedIds = new Set(
    [project.programId, ...project.connectedProgramIds].filter(Boolean),
  );
  const connectedTitles = new Set(
    project.connectedProgramTitles.map((title) => normalizeTitle(title)),
  );
  const matchedPrograms = programDrafts.filter((program) => {
    if (connectedIds.has(program.id)) return true;
    if (connectedTitles.has(normalizeTitle(program.title))) return true;
    return false;
  });

  if (matchedPrograms.length > 0) return uniquePrograms(matchedPrograms);
  if (!project.villageId) return [];

  return uniquePrograms(
    programDrafts.filter((program) => program.villageId === project.villageId),
  );
}

function uniquePrograms(programDrafts: HostProgramDraft[]): HostProgramDraft[] {
  const seen = new Set<string>();
  return programDrafts.filter((program) => {
    const key = program.id || program.slug || program.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/gu, "").trim().toLowerCase();
}

function stableHash(value: string): string {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function resolveProjectProgramTitles(
  project: HostProjectOverview,
  applications: HostApplication[],
): string[] {
  const explicitTitles = project.connectedProgramTitles.filter(
    (title) => title && title !== "전체 프로그램",
  );
  const scopedApplicationTitles = project.applications.map(
    (application) => application.programTitle,
  );
  const fallbackTitles = applications.map((application) => application.programTitle);
  const titles =
    explicitTitles.length > 0
      ? explicitTitles
      : scopedApplicationTitles.length > 0
        ? scopedApplicationTitles
        : fallbackTitles;

  return Array.from(new Set(titles));
}
