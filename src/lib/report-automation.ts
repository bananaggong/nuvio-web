import {
  readHostApplicationsFromStorage,
  summarizeApplications,
} from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";

export type ReportProjectStatus = "draft" | "review" | "ready";

export type ReportSectionId =
  | "overview"
  | "participants"
  | "payments"
  | "evidence"
  | "reviews"
  | "risks"
  | "nextActions";

export type ReportProject = {
  id: string;
  title: string;
  agencyName: string;
  programTitle: string;
  periodLabel: string;
  ownerName: string;
  status: ReportProjectStatus;
  sections: ReportSectionId[];
  updatedAt: string;
};

export type GeneratedReportSection = {
  id: ReportSectionId;
  title: string;
  body: string;
};

export type ReportChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  helper: string;
};

export const REPORT_PROJECT_STORAGE_KEY = "nuvio:report-projects";

export const reportSectionLabels: Record<ReportSectionId, string> = {
  overview: "사업 개요",
  participants: "참여자 현황",
  payments: "정산 및 지원금",
  evidence: "증빙 수집",
  reviews: "후기 및 성과",
  risks: "리스크",
  nextActions: "후속 조치",
};

export const reportStatusLabels: Record<ReportProjectStatus, string> = {
  draft: "작성중",
  review: "검토중",
  ready: "제출 가능",
};

export const reportSectionOrder: ReportSectionId[] = [
  "overview",
  "participants",
  "payments",
  "evidence",
  "reviews",
  "risks",
  "nextActions",
];

export const seedReportProjects: ReportProject[] = [
  {
    id: "report-gangneung-workation",
    title: "강릉 파도 워케이션 6월 결과보고",
    agencyName: "강릉시 관광과",
    programTitle: "강릉 파도 워케이션 6월",
    periodLabel: "2026.06.01 - 2026.06.30",
    ownerName: "누비오 운영팀",
    status: "draft",
    sections: [
      "overview",
      "participants",
      "payments",
      "evidence",
      "reviews",
      "risks",
      "nextActions",
    ],
    updatedAt: "2026-05-04T00:00:00+09:00",
  },
];

export function readReportProjects(): ReportProject[] {
  if (typeof window === "undefined") return seedReportProjects;

  try {
    const rawValue = window.localStorage.getItem(REPORT_PROJECT_STORAGE_KEY);
    if (!rawValue) return seedReportProjects;
    return JSON.parse(rawValue) as ReportProject[];
  } catch {
    return seedReportProjects;
  }
}

export function writeReportProjects(projects: ReportProject[]) {
  window.localStorage.setItem(
    REPORT_PROJECT_STORAGE_KEY,
    JSON.stringify(projects),
  );
}

export function createReportProject(): ReportProject {
  return {
    id: `report-${Date.now()}`,
    title: "새 결과보고서",
    agencyName: "제출 기관명",
    programTitle: "전체 프로그램",
    periodLabel: "운영 기간 입력",
    ownerName: "담당자명",
    status: "draft",
    sections: ["overview", "participants", "payments", "evidence", "risks"],
    updatedAt: new Date().toISOString(),
  };
}

export function getReportApplications(
  project: ReportProject,
  applications = readHostApplicationsFromStorage(),
): HostApplication[] {
  if (project.programTitle === "전체 프로그램") return applications;
  return applications.filter(
    (application) => application.programTitle === project.programTitle,
  );
}

export function buildReportChecklist(
  project: ReportProject,
  applications = readHostApplicationsFromStorage(),
): ReportChecklistItem[] {
  const scopedApplications = getReportApplications(project, applications);
  const summary = summarizeApplications(scopedApplications);
  const missingSignatures = scopedApplications.filter(
    (application) => !application.signatureCompleted,
  ).length;
  const missingReceipts = scopedApplications.filter(
    (application) => application.receiptCount === 0,
  ).length;
  const missingReviews = scopedApplications.filter(
    (application) => !application.reviewSubmitted,
  ).length;

  return [
    {
      id: "applications",
      label: "신청자 데이터",
      done: scopedApplications.length > 0,
      helper: `${scopedApplications.length}명 기준으로 집계됩니다.`,
    },
    {
      id: "signatures",
      label: "서명 완료",
      done: missingSignatures === 0,
      helper:
        missingSignatures === 0
          ? "모든 참여자 서명이 완료됐습니다."
          : `${missingSignatures}명의 서명이 필요합니다.`,
    },
    {
      id: "receipts",
      label: "영수증/증빙",
      done: missingReceipts === 0,
      helper:
        missingReceipts === 0
          ? `${summary.receiptCount}건의 증빙이 수집됐습니다.`
          : `${missingReceipts}명에게 증빙 요청이 필요합니다.`,
    },
    {
      id: "reviews",
      label: "후기 수집",
      done: missingReviews === 0,
      helper:
        missingReviews === 0
          ? "후기 제출 현황이 제출 조건을 충족합니다."
          : `${missingReviews}명의 후기가 아직 비어 있습니다.`,
    },
    {
      id: "readiness",
      label: "제출 준비율",
      done: summary.reportReadiness >= 80,
      helper: `${summary.reportReadiness}% 준비됐습니다.`,
    },
  ];
}

export function buildGeneratedReportSections(
  project: ReportProject,
  applications = readHostApplicationsFromStorage(),
): GeneratedReportSection[] {
  const scopedApplications = getReportApplications(project, applications);
  const summary = summarizeApplications(scopedApplications);
  const missingChecklist = buildReportChecklist(project, applications).filter(
    (item) => !item.done,
  );
  const paidApplicants = scopedApplications.filter(
    (application) => application.paymentAmount > 0,
  ).length;
  const sectionMap: Record<ReportSectionId, GeneratedReportSection> = {
    overview: {
      id: "overview",
      title: reportSectionLabels.overview,
      body: `${project.title}는 ${project.periodLabel} 기간 동안 ${project.agencyName} 제출용으로 정리 중인 운영 보고서입니다. 현재 ${summary.total}명의 신청 데이터를 기준으로 참여, 정산, 증빙, 후기 현황을 자동 집계합니다.`,
    },
    participants: {
      id: "participants",
      title: reportSectionLabels.participants,
      body: `총 신청자는 ${summary.total}명이며 선정 이후 단계는 ${summary.accepted + summary.checkedIn + summary.completed}명입니다. 참여중 ${summary.checkedIn}명, 완료 ${summary.completed}명으로 운영 상태가 기록되어 있습니다.`,
    },
    payments: {
      id: "payments",
      title: reportSectionLabels.payments,
      body: `현재 기록된 정산 금액은 ${summary.paidAmount.toLocaleString("ko-KR")}원입니다. 결제 또는 계좌이체 금액이 입력된 참여자는 ${paidApplicants}명이며, 영수증은 총 ${summary.receiptCount}건 수집됐습니다.`,
    },
    evidence: {
      id: "evidence",
      title: reportSectionLabels.evidence,
      body: `서명 완료 ${summary.signatureCount}/${summary.total}, 증빙 수집 ${summary.receiptCount}건, 후기 제출 ${summary.reviewCount}/${summary.total} 상태입니다. 제출 전 누락 항목은 체크리스트에서 보완합니다.`,
    },
    reviews: {
      id: "reviews",
      title: reportSectionLabels.reviews,
      body: `후기 제출자는 ${summary.reviewCount}명입니다. 후기는 다음 모집 홍보, 참여자 만족도 근거, 지자체 정성 성과 요약에 재활용할 수 있습니다.`,
    },
    risks: {
      id: "risks",
      title: reportSectionLabels.risks,
      body:
        missingChecklist.length > 0
          ? `현재 보완이 필요한 항목은 ${missingChecklist.map((item) => item.label).join(", ")}입니다. 제출 전 담당자 확인과 참여자 리마인드 발송이 필요합니다.`
          : "필수 제출 항목이 모두 충족되어 큰 제출 리스크는 낮습니다.",
    },
    nextActions: {
      id: "nextActions",
      title: reportSectionLabels.nextActions,
      body: "다음 단계는 누락 증빙 요청, 최종 정산 금액 확인, 운영 담당자 검토, 제출용 PDF 또는 XLSX 산출물 생성입니다.",
    },
  };

  return project.sections.map((sectionId) => sectionMap[sectionId]);
}

export function buildReportMarkdown(
  project: ReportProject,
  applications = readHostApplicationsFromStorage(),
): string {
  const sections = buildGeneratedReportSections(project, applications);
  const checklist = buildReportChecklist(project, applications);

  return [
    `# ${project.title}`,
    "",
    `- 제출 기관: ${project.agencyName}`,
    `- 대상 프로그램: ${project.programTitle}`,
    `- 운영 기간: ${project.periodLabel}`,
    `- 담당자: ${project.ownerName}`,
    `- 상태: ${reportStatusLabels[project.status]}`,
    "",
    "## 제출 체크리스트",
    ...checklist.map(
      (item) => `- [${item.done ? "x" : " "}] ${item.label}: ${item.helper}`,
    ),
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      section.body,
      "",
    ]),
  ].join("\n");
}

export function buildReportJson(
  project: ReportProject,
  applications = readHostApplicationsFromStorage(),
): string {
  const scopedApplications = getReportApplications(project, applications);

  return JSON.stringify(
    {
      project,
      summary: summarizeApplications(scopedApplications),
      checklist: buildReportChecklist(project, applications),
      sections: buildGeneratedReportSections(project, applications),
      applications: scopedApplications,
    },
    null,
    2,
  );
}
