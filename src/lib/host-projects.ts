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
  activityEnd?: string;
  activityStart?: string;
  id: string;
  imageUrl: string;
  missingEvidenceCount: number;
  pendingCount: number;
  periodLabel?: string;
  readiness: number;
  recruitEnd?: string;
  recruitStart?: string;
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
  const legacyPrograms = resolveProjectProgramTitles(project)
    .filter((title) => !draftTitles.has(normalizeTitle(title)))
    .map((title) => buildProgramOverviewFromTitle(project, title, applications));

  return [...draftPrograms, ...legacyPrograms].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function buildStandaloneHostProgramOverviews(
  applications: HostApplication[],
  _reportProjects: ReportProject[],
  programDrafts: HostProgramDraft[] = [],
): HostProgramOverview[] {
  const standaloneDrafts = uniquePrograms(
    programDrafts,
  );
  const draftPrograms = standaloneDrafts.map((program) =>
    buildStandaloneProgramOverviewFromDraft(program, applications),
  );
  const draftIds = new Set(draftPrograms.map((program) => program.id));
  const draftTitles = new Set(
    draftPrograms.map((program) => normalizeTitle(program.title)),
  );
  const legacyPrograms = applications
    .filter(
      (application) =>
        !application.programId || !draftIds.has(application.programId),
    )
    .map((application) => application.programTitle)
    .filter((title) => {
      const normalizedTitle = normalizeTitle(title);
      if (!normalizedTitle) return false;
      if (draftTitles.has(normalizedTitle)) return false;
      return true;
    })
    .filter((title, index, titles) => titles.indexOf(title) === index)
    .map((title) => buildStandaloneProgramOverviewFromTitle(title, applications));

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

export function findStandaloneHostProgramOverview(
  programId: string,
  applications: HostApplication[],
  reportProjects: ReportProject[],
  programDrafts: HostProgramDraft[] = [],
): HostProgramOverview | undefined {
  return buildStandaloneHostProgramOverviews(
    applications,
    reportProjects,
    programDrafts,
  ).find(
    (program) =>
      program.id === programId ||
      program.slug === programId ||
      hostProgramId(program.title) === programId,
  );
}

export function findHostProgramDraftOverview(
  programId: string,
  applications: HostApplication[],
  programDrafts: HostProgramDraft[] = [],
): HostProgramOverview | undefined {
  const program = findHostProgramDraft(programId, programDrafts);

  return program
    ? buildStandaloneProgramOverviewFromDraft(program, applications)
    : undefined;
}

export function findHostProgramDraft(
  programId: string,
  programDrafts: HostProgramDraft[] = [],
): HostProgramDraft | undefined {
  return programDrafts.find((draft) => {
    const identifiers = [draft.id, draft.slug ?? "", hostProgramId(draft.title)];
    return identifiers.includes(programId);
  });
}

export function getHostProgramSidebarStatus(
  program?: Pick<HostProgramOverview, "status">,
  draft?: { published?: boolean; status?: ProgramStatus },
): string {
  if (draft && !draft.published) return "프로그램 작성중";

  switch (draft?.status ?? program?.status) {
    case "upcoming":
      return "모집예정";
    case "open":
      return "모집 진행중";
    case "closed":
      return "마감";
    case "earlyClosed":
      return "조기마감";
    default:
      return "프로그램 작성중";
  }
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

export function hostStandaloneProgramPath(programId: string): string {
  return `/host/programs/${encodeURIComponent(programId)}`;
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
    activityEnd: program.activityEnd,
    activityStart: program.activityStart,
    id: program.id,
    imageUrl: program.image || resolveProgramImage(program.title),
    missingEvidenceCount: countMissingEvidence(programApplications),
    pendingCount,
    periodLabel: formatProgramDraftPeriod(program),
    readiness: applicationSummary.reportReadiness,
    recruitEnd: program.recruitEnd,
    recruitStart: program.recruitStart,
    slug: program.slug,
    status: program.status,
    title: program.title,
    updatedAt: programApplications[0]?.submittedAt ?? program.updatedAt ?? project.updatedAt,
    villageId: program.villageId,
  };
}

function buildStandaloneProgramOverviewFromDraft(
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
    activityEnd: program.activityEnd,
    activityStart: program.activityStart,
    id: program.id,
    imageUrl: program.image || resolveProgramImage(program.title),
    missingEvidenceCount: countMissingEvidence(programApplications),
    pendingCount,
    periodLabel: formatProgramDraftPeriod(program),
    readiness: applicationSummary.reportReadiness,
    recruitEnd: program.recruitEnd,
    recruitStart: program.recruitStart,
    slug: program.slug,
    status: program.status,
    title: program.title,
    updatedAt: programApplications[0]?.submittedAt ?? program.updatedAt,
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
    periodLabel: project.periodLabel,
    readiness: applicationSummary.reportReadiness,
    status: "open",
    title,
    updatedAt: programApplications[0]?.submittedAt ?? project.updatedAt,
  };
}

function buildStandaloneProgramOverviewFromTitle(
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
    periodLabel: "",
    readiness: applicationSummary.reportReadiness,
    status: "open",
    title,
    updatedAt: programApplications[0]?.submittedAt ?? new Date().toISOString(),
  };
}

function countMissingEvidence(applications: HostApplication[]): number {
  return applications.reduce(
    (sum, application) =>
      sum + (application.receiptCount > 0 || application.status === "rejected" ? 0 : 1),
    0,
  );
}

function formatProgramDraftPeriod(program: HostProgramDraft): string {
  const start = formatShortProgramDate(program.activityStart || program.recruitStart);
  const end = formatShortProgramDate(program.activityEnd || program.recruitEnd);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - 기간 미정`;
  if (end) return `기간 미정 - ${end}`;
  return "";
}

function formatShortProgramDate(value?: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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
  if (connectedIds.size > 0) {
    return uniquePrograms(
      programDrafts.filter((program) => connectedIds.has(program.id)),
    );
  }

  const connectedTitles = new Set(
    project.connectedProgramTitles.map((title) => normalizeTitle(title)),
  );
  const matchedPrograms = programDrafts.filter((program) => {
    if (connectedTitles.has(normalizeTitle(program.title))) return true;
    return false;
  });

  return uniquePrograms(matchedPrograms);
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

function resolveProjectProgramTitles(project: HostProjectOverview): string[] {
  const explicitTitles = project.connectedProgramTitles.filter(
    (title) => title && title !== "전체 프로그램",
  );
  const scopedApplicationTitles = project.applications.map(
    (application) => application.programTitle,
  );
  const titles =
    explicitTitles.length > 0
      ? explicitTitles
      : scopedApplicationTitles.length > 0
        ? scopedApplicationTitles
        : [];

  return Array.from(new Set(titles));
}
