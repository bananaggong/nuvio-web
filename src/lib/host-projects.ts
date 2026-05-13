import {
  summarizeApplications,
  type HostApplication,
} from "@/lib/host-operations";
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
  connectedProgramTitles: string[];
  id: string;
  imageUrl: string;
  kind: HostProjectKind;
  missingEvidenceCount: number;
  ownerName: string;
  pendingCount: number;
  periodLabel: string;
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
  title: string;
  updatedAt: string;
};

export function buildHostProjectOverviews(
  applications: HostApplication[],
  reportProjects: ReportProject[],
): HostProjectOverview[] {
  const operationProjects = reportProjects.map((project) =>
    buildOperationProjectOverview(project, applications),
  );

  return operationProjects.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function findHostProjectOverview(
  projectId: string,
  applications: HostApplication[],
  reportProjects: ReportProject[],
): HostProjectOverview | undefined {
  return buildHostProjectOverviews(applications, reportProjects).find(
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
  const titles = resolveProjectProgramTitles(project, applications);

  return titles.map((title) => {
    const programApplications = applications.filter(
      (application) => application.programTitle === title,
    );
    const applicationSummary = summarizeApplications(programApplications);
    const pendingCount = programApplications.filter((application) =>
      ["submitted", "screening"].includes(application.status),
    ).length;
    const latestSubmittedAt =
      programApplications[0]?.submittedAt ?? project.updatedAt;

    return {
      activeCount:
        applicationSummary.accepted +
        applicationSummary.checkedIn +
        applicationSummary.completed,
      applicationCount: programApplications.length,
      applications: programApplications,
      id: hostProgramId(title),
      imageUrl: resolveProgramImage(title),
      missingEvidenceCount: programApplications.reduce(
        (sum, application) =>
          sum + (application.receiptCount > 0 || application.status === "rejected" ? 0 : 1),
        0,
      ),
      pendingCount,
      readiness: applicationSummary.reportReadiness,
      title,
      updatedAt: latestSubmittedAt,
    } satisfies HostProgramOverview;
  });
}

export function findHostProgramOverview(
  projectId: string,
  programId: string,
  applications: HostApplication[],
  reportProjects: ReportProject[],
): HostProgramOverview | undefined {
  const project = findHostProjectOverview(projectId, applications, reportProjects);
  if (!project) return undefined;

  return buildHostProgramOverviews(project, applications).find(
    (program) => program.id === programId,
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
): HostProjectOverview {
  const scopedApplications = getReportApplications(project, applications);
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
    connectedProgramTitles: project.connectedProgramTitles,
    id: project.id,
    imageUrl: resolveProjectImage(project),
    kind: "operation",
    missingEvidenceCount: reportSummary.missingEvidenceCount,
    ownerName: project.ownerName,
    pendingCount,
    periodLabel: project.periodLabel,
    readiness: reportSummary.readiness,
    reportProject: project,
    reviewMissingCount: scopedApplications.filter(
      (application) => !application.reviewSubmitted,
    ).length,
    signatureMissingCount: scopedApplications.filter(
      (application) => !application.signatureCompleted,
    ).length,
    statusLabel: project.status === "ready" ? "마감 준비" : project.status === "review" ? "수집 중" : "설계 중",
    title: project.title,
    totalBudget: reportSummary.totalBudget,
    updatedAt: project.updatedAt,
    usedAmount: reportSummary.usedAmount,
    villageName: project.villageName,
  };
}

function resolveProjectImage(project: ReportProject): string {
  if (project.imageUrl) return project.imageUrl;

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
