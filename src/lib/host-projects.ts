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

export function buildHostProjectOverviews(
  applications: HostApplication[],
  reportProjects: ReportProject[],
): HostProjectOverview[] {
  const operationProjects = reportProjects.map((project) =>
    buildOperationProjectOverview(project, applications),
  );
  const programProjects = buildProgramProjectOverviews(applications);

  return [...operationProjects, ...programProjects].sort(
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

function buildProgramProjectOverviews(
  applications: HostApplication[],
): HostProjectOverview[] {
  const applicationsByProgram = new Map<string, HostApplication[]>();

  for (const application of applications) {
    const current = applicationsByProgram.get(application.programTitle) ?? [];
    applicationsByProgram.set(application.programTitle, [...current, application]);
  }

  return [...applicationsByProgram.entries()].map(([programTitle, programApplications]) => {
    const applicationSummary = summarizeApplications(programApplications);
    const pendingCount = programApplications.filter((application) =>
      ["submitted", "screening"].includes(application.status),
    ).length;
    const latestSubmittedAt =
      programApplications[0]?.submittedAt ?? new Date().toISOString();

    return {
      activeCount:
        applicationSummary.accepted +
        applicationSummary.checkedIn +
        applicationSummary.completed,
      activityCount: 0,
      applicationCount: programApplications.length,
      applications: programApplications,
      completedCount: applicationSummary.completed,
      connectedProgramTitles: [programTitle],
      id: createProgramProjectId(programTitle),
      imageUrl: resolveProgramImage(programTitle),
      kind: "program",
      missingEvidenceCount: programApplications.reduce(
        (sum, application) =>
          sum + (application.receiptCount > 0 || application.status === "rejected" ? 0 : 1),
        0,
      ),
      ownerName: "프로그램 운영자",
      pendingCount,
      periodLabel: "프로그램 단위 운영",
      readiness: applicationSummary.reportReadiness,
      reviewMissingCount: programApplications.filter(
        (application) => !application.reviewSubmitted,
      ).length,
      signatureMissingCount: programApplications.filter(
        (application) => !application.signatureCompleted,
      ).length,
      statusLabel: pendingCount > 0 ? "모집/검토" : "운영 중",
      title: programTitle,
      totalBudget: 0,
      updatedAt: latestSubmittedAt,
      usedAmount: applicationSummary.paidAmount,
      villageName: inferVillageName(programTitle),
    } satisfies HostProjectOverview;
  });
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

function createProgramProjectId(programTitle: string): string {
  const slug = programTitle
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return `program-${slug || stableHash(programTitle)}`;
}

function stableHash(value: string): string {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function inferVillageName(programTitle: string): string {
  if (programTitle.includes("보성") || programTitle.includes("로컬살롱") || programTitle.includes("차")) {
    return "전체차LAB";
  }
  if (programTitle.includes("강릉")) return "강릉 로컬워크";
  if (programTitle.includes("남해")) return "남해 체류관광";
  if (programTitle.includes("제천")) return "제천 관광지원센터";
  if (programTitle.includes("고흥")) return "고흥 별빛마을";
  return "로컬홈";
}
