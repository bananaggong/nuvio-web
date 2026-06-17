import { summarizeApplications } from "@/lib/host-operations";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import type { HostApplication } from "@/lib/host-operations";

export type ReportProjectStatus = "draft" | "review" | "ready";

export type ReportSectionId =
  | "overview"
  | "budget"
  | "expenses"
  | "evidence"
  | "activities"
  | "risks"
  | "nextActions";

export type OperationFieldGroup =
  | "organization_profile"
  | "operation_project"
  | "budget_config"
  | "expense_event"
  | "evidence_item"
  | "activity_event"
  | "report_manual_input";

export type OperationFieldType = "text" | "number" | "date" | "file" | "checkbox";

export type EvidenceItemStatus = "missing" | "submitted" | "approved";

export type BudgetCategory = {
  id: string;
  label: string;
  parentLabel: string;
  plannedAmount: number;
};

export type EvidenceRule = {
  id: string;
  categoryId: string;
  label: string;
  required: boolean;
  type: "file" | "check" | "text";
};

export type EvidenceItem = {
  ruleId: string;
  label: string;
  status: EvidenceItemStatus;
  fileName?: string;
  note?: string;
};

export type ExpenseEvent = {
  id: string;
  title: string;
  spentAt: string;
  categoryId: string;
  amount: number;
  vendor: string;
  paymentMethod: "card" | "transfer" | "cash" | "other";
  linkedActivityId?: string;
  memo?: string;
  evidenceItems: EvidenceItem[];
};

export type ActivityEvent = {
  id: string;
  title: string;
  activityAt: string;
  place: string;
  relatedProgramTitle: string;
  participantCount: number;
  photosCount: number;
  description: string;
};

export type ReportManualField = {
  id: string;
  group: OperationFieldGroup;
  label: string;
  fieldType: OperationFieldType;
  required: boolean;
  value: string;
};

export type ReportProject = {
  id: string;
  title: string;
  villageId?: string;
  villageName: string;
  villageSlug?: string;
  agencyName: string;
  imageUrl?: string;
  programId?: string;
  programTitle: string;
  connectedProgramIds: string[];
  connectedProgramTitles: string[];
  periodLabel: string;
  ownerName: string;
  status: ReportProjectStatus;
  sections: ReportSectionId[];
  budgetCategories: BudgetCategory[];
  evidenceRules: EvidenceRule[];
  expenseEvents: ExpenseEvent[];
  activityEvents: ActivityEvent[];
  manualFields: ReportManualField[];
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

export type ReportProjectSummary = {
  activityCount: number;
  budgetUsageRate: number;
  completedEvidenceCount: number;
  expenseCount: number;
  linkedProgramCount: number;
  manualMissingCount: number;
  missingEvidenceCount: number;
  overBudgetAmount: number;
  participantCount: number;
  readiness: number;
  requiredEvidenceCount: number;
  totalBudget: number;
  usedAmount: number;
};

export const operationFieldGroupLabels: Record<OperationFieldGroup, string> = {
  organization_profile: "로컬페이지 프로필",
  operation_project: "운영 폴더",
  budget_config: "예산 구조",
  expense_event: "지출 이벤트",
  evidence_item: "증빙 항목",
  activity_event: "활동 이벤트",
  report_manual_input: "보고 수동 입력",
};

export const operationFieldTypeLabels: Record<OperationFieldType, string> = {
  checkbox: "체크",
  date: "날짜",
  file: "파일",
  number: "숫자",
  text: "텍스트",
};

export const paymentMethodLabels: Record<ExpenseEvent["paymentMethod"], string> = {
  card: "카드",
  cash: "현금",
  other: "기타",
  transfer: "계좌이체",
};

export const evidenceStatusLabels: Record<EvidenceItemStatus, string> = {
  approved: "검토 완료",
  missing: "미수집",
  submitted: "수집",
};

export const reportSectionLabels: Record<ReportSectionId, string> = {
  activities: "활동/참석 자료",
  budget: "예산 구조",
  evidence: "증빙 준비",
  expenses: "지출 이벤트",
  nextActions: "다음 조치",
  overview: "운영 폴더 개요",
  risks: "리스크",
};

export const reportStatusLabels: Record<ReportProjectStatus, string> = {
  draft: "설계 중",
  ready: "마감 준비",
  review: "수집 중",
};

export const reportSectionOrder: ReportSectionId[] = [
  "overview",
  "budget",
  "expenses",
  "evidence",
  "activities",
  "risks",
  "nextActions",
];

export const defaultBudgetCategories: BudgetCategory[] = [
  {
    id: "budget-program",
    label: "프로그램 운영",
    parentLabel: "사업진행비",
    plannedAmount: 48000000,
  },
  {
    id: "budget-space",
    label: "공간 운영",
    parentLabel: "사업진행비",
    plannedAmount: 18000000,
  },
  {
    id: "budget-promotion",
    label: "홍보/콘텐츠",
    parentLabel: "사업진행비",
    plannedAmount: 9000000,
  },
  {
    id: "budget-operation",
    label: "운영비",
    parentLabel: "운영비",
    plannedAmount: 12000000,
  },
];

export const defaultEvidenceRules: EvidenceRule[] = [
  {
    id: "evidence-receipt",
    categoryId: "all",
    label: "영수증 또는 세금계산서",
    required: true,
    type: "file",
  },
  {
    id: "evidence-transfer",
    categoryId: "all",
    label: "결제/이체 확인",
    required: true,
    type: "file",
  },
  {
    id: "evidence-activity",
    categoryId: "budget-program",
    label: "활동내역과 참석자 기록",
    required: true,
    type: "check",
  },
  {
    id: "evidence-photo",
    categoryId: "budget-promotion",
    label: "결과 사진 또는 게시물 링크",
    required: true,
    type: "file",
  },
  {
    id: "evidence-contract",
    categoryId: "budget-space",
    label: "계약서 또는 거래명세",
    required: true,
    type: "file",
  },
];

export const seedReportProjects: ReportProject[] = [
  {
    id: "operation-boseong-2026",
    title: "보성 로컬페이지 2026 운영 폴더",
    villageId: "33333333-4444-4555-8666-777777777777",
    villageName: "전체차LAB",
    villageSlug: "boseong",
    agencyName: "보성 로컬페이지 운영팀",
    imageUrl: "/boseong/hero-illustration.png",
    programId: "",
    programTitle: "전체 프로그램",
    connectedProgramIds: [],
    connectedProgramTitles: ["나를 담는 차 실험실", "로컬살롱"],
    periodLabel: "2026.05.01 - 2026.11.30",
    ownerName: "운영 담당자",
    status: "review",
    sections: reportSectionOrder,
    budgetCategories: defaultBudgetCategories,
    evidenceRules: defaultEvidenceRules,
    expenseEvents: [
      {
        id: "expense-tea-session",
        title: "숙재밭 오프닝 체험 재료비",
        spentAt: "2026-05-18",
        categoryId: "budget-program",
        amount: 820000,
        vendor: "보성 지역상점",
        paymentMethod: "card",
        linkedActivityId: "activity-tea-session",
        memo: "누비어 체험 재료와 현장 운영 물품",
        evidenceItems: [
          {
            ruleId: "evidence-receipt",
            label: "영수증 또는 세금계산서",
            status: "submitted",
            fileName: "receipt-tea-session.pdf",
          },
          {
            ruleId: "evidence-transfer",
            label: "결제/이체 확인",
            status: "submitted",
          },
          {
            ruleId: "evidence-activity",
            label: "활동내역과 참석자 기록",
            status: "missing",
          },
        ],
      },
      {
        id: "expense-content",
        title: "전체차LAB 모집 콘텐츠 촬영",
        spentAt: "2026-05-21",
        categoryId: "budget-promotion",
        amount: 1350000,
        vendor: "로컬 콘텐츠 스튜디오",
        paymentMethod: "transfer",
        linkedActivityId: "activity-content",
        memo: "모집 홍보용 사진/영상 제작",
        evidenceItems: [
          {
            ruleId: "evidence-receipt",
            label: "영수증 또는 세금계산서",
            status: "submitted",
          },
          {
            ruleId: "evidence-transfer",
            label: "결제/이체 확인",
            status: "missing",
          },
          {
            ruleId: "evidence-photo",
            label: "결과 사진 또는 게시물 링크",
            status: "submitted",
            note: "인스타그램 게시물 연결 예정",
          },
        ],
      },
    ],
    activityEvents: [
      {
        id: "activity-tea-session",
        title: "숙재밭 오프닝 체험",
        activityAt: "2026-05-18",
        place: "보성 녹차밭 라운지",
        relatedProgramTitle: "숙재밭",
        participantCount: 18,
        photosCount: 4,
        description: "누비어들이 차밭 산책과 로컬 티 블렌딩을 경험했습니다.",
      },
      {
        id: "activity-content",
        title: "모집 콘텐츠 촬영",
        activityAt: "2026-05-21",
        place: "전체차LAB 공간",
        relatedProgramTitle: "전체 프로그램",
        participantCount: 6,
        photosCount: 12,
        description: "다음 모집에 사용할 로컬페이지 대표 이미지와 숏폼을 제작했습니다.",
      },
    ],
    manualFields: [
      {
        id: "manual-online-promo",
        group: "report_manual_input",
        label: "온라인 홍보 성과",
        fieldType: "text",
        required: true,
        value: "인스타그램 게시 4건, 릴스 조회 12,400회",
      },
      {
        id: "manual-next-plan",
        group: "report_manual_input",
        label: "다음 달 추진 계획",
        fieldType: "text",
        required: true,
        value: "",
      },
    ],
    updatedAt: "2026-05-10T00:00:00+09:00",
  },
];

export function readReportProjects(): ReportProject[] {
  return isDemoModeEnabled() ? seedReportProjects : [];
}

export function mergeReportProjects(
  primaryProjects: ReportProject[],
  secondaryProjects: ReportProject[],
): ReportProject[] {
  const seen = new Set<string>();
  const mergedProjects: ReportProject[] = [];

  for (const project of [...primaryProjects, ...secondaryProjects]) {
    const normalized = normalizeReportProjectModel(project);
    const key = normalized.id || normalized.title;
    if (seen.has(key)) continue;

    seen.add(key);
    mergedProjects.push(normalized);
  }

  return mergedProjects;
}

export function createReportProject(): ReportProject {
  return {
    id: `operation-${Date.now()}`,
    title: "새 운영 폴더",
    villageId: "",
    villageName: "로컬페이지",
    villageSlug: "",
    agencyName: "운영 조직명",
    imageUrl: "",
    programId: "",
    programTitle: "전체 프로그램",
    connectedProgramIds: [],
    connectedProgramTitles: [],
    periodLabel: "운영 기간 입력",
    ownerName: "담당자명",
    status: "draft",
    sections: reportSectionOrder,
    budgetCategories: defaultBudgetCategories.map((category) => ({
      ...category,
      id: `${category.id}-${Date.now()}`,
    })),
    evidenceRules: defaultEvidenceRules.map((rule) => ({
      ...rule,
      id: `${rule.id}-${Date.now()}`,
    })),
    expenseEvents: [],
    activityEvents: [],
    manualFields: [
      createManualField("report_manual_input", "주요 성과"),
      createManualField("report_manual_input", "개선/보완 사항"),
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function createBudgetCategory(): BudgetCategory {
  return {
    id: `budget-${Date.now()}`,
    label: "새 예산 항목",
    parentLabel: "운영비",
    plannedAmount: 0,
  };
}

export function createEvidenceRule(categoryId = "all"): EvidenceRule {
  return {
    id: `evidence-${Date.now()}`,
    categoryId,
    label: "새 증빙 항목",
    required: true,
    type: "file",
  };
}

export function createExpenseEvent(project: ReportProject): ExpenseEvent {
  const categoryId = project.budgetCategories[0]?.id ?? "all";
  return {
    id: `expense-${Date.now()}`,
    title: "새 지출",
    spentAt: new Date().toISOString().slice(0, 10),
    categoryId,
    amount: 0,
    vendor: "",
    paymentMethod: "card",
    memo: "",
    evidenceItems: [],
  };
}

export function createActivityEvent(): ActivityEvent {
  return {
    id: `activity-${Date.now()}`,
    title: "새 활동",
    activityAt: new Date().toISOString().slice(0, 10),
    place: "",
    relatedProgramTitle: "전체 프로그램",
    participantCount: 0,
    photosCount: 0,
    description: "",
  };
}

export function createManualField(
  group: OperationFieldGroup = "report_manual_input",
  label = "새 보고 필드",
): ReportManualField {
  return {
    id: `manual-${Date.now()}`,
    fieldType: "text",
    group,
    label,
    required: true,
    value: "",
  };
}

export function getReportApplications(
  project: ReportProject,
  applications: HostApplication[] = [],
): HostApplication[] {
  const connectedIds = project.connectedProgramIds.filter(Boolean);
  const connectedTitles = project.connectedProgramTitles.filter(Boolean);
  if (connectedTitles.includes("전체 프로그램")) {
    return applications;
  }
  if (connectedIds.length === 0 && connectedTitles.length === 0) return [];

  return applications.filter((application) =>
    (typeof application.programId === "string" &&
      connectedIds.includes(application.programId)) ||
    connectedTitles.includes(application.programTitle),
  );
}

export function getExpenseEvidenceItems(
  project: ReportProject,
  expense: ExpenseEvent,
): EvidenceItem[] {
  const rules = project.evidenceRules.filter(
    (rule) => rule.categoryId === "all" || rule.categoryId === expense.categoryId,
  );
  const savedItems = new Map(
    expense.evidenceItems.map((item) => [item.ruleId, item]),
  );

  return rules.map((rule) => ({
    ruleId: rule.id,
    label: rule.label,
    status: savedItems.get(rule.id)?.status ?? "missing",
    fileName: savedItems.get(rule.id)?.fileName,
    note: savedItems.get(rule.id)?.note,
  }));
}

export function summarizeReportProject(
  project: ReportProject,
  applications: HostApplication[] = [],
): ReportProjectSummary {
  const scopedApplications = getReportApplications(project, applications);
  const totalBudget = project.budgetCategories.reduce(
    (sum, category) => sum + category.plannedAmount,
    0,
  );
  const usedAmount = project.expenseEvents.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const evidenceItems = project.expenseEvents.flatMap((expense) =>
    getExpenseEvidenceItems(project, expense),
  );
  const requiredEvidenceCount = evidenceItems.length;
  const completedEvidenceCount = evidenceItems.filter(
    (item) => item.status === "submitted" || item.status === "approved",
  ).length;
  const missingEvidenceCount = Math.max(
    requiredEvidenceCount - completedEvidenceCount,
    0,
  );
  const manualMissingCount = project.manualFields.filter(
    (field) => field.required && field.value.trim().length === 0,
  ).length;
  const participantCount =
    project.activityEvents.reduce(
      (sum, activity) => sum + activity.participantCount,
      0,
    ) || scopedApplications.length;
  const budgetScore = project.budgetCategories.length > 0 ? 15 : 0;
  const expenseScore = project.expenseEvents.length > 0 ? 20 : 0;
  const evidenceScore =
    requiredEvidenceCount === 0
      ? 10
      : Math.round((completedEvidenceCount / requiredEvidenceCount) * 30);
  const activityScore = project.activityEvents.length > 0 ? 15 : 0;
  const manualScore =
    project.manualFields.length === 0
      ? 10
      : Math.max(0, 20 - manualMissingCount * 8);

  return {
    activityCount: project.activityEvents.length,
    budgetUsageRate:
      totalBudget > 0 ? Math.round((usedAmount / totalBudget) * 100) : 0,
    completedEvidenceCount,
    expenseCount: project.expenseEvents.length,
    linkedProgramCount: Math.max(
      project.connectedProgramIds.length,
      project.connectedProgramTitles.length,
    ),
    manualMissingCount,
    missingEvidenceCount,
    overBudgetAmount: Math.max(usedAmount - totalBudget, 0),
    participantCount,
    readiness: Math.min(
      100,
      budgetScore + expenseScore + evidenceScore + activityScore + manualScore,
    ),
    requiredEvidenceCount,
    totalBudget,
    usedAmount,
  };
}

export function buildReportChecklist(
  project: ReportProject,
  applications: HostApplication[] = [],
): ReportChecklistItem[] {
  const summary = summarizeReportProject(project, applications);

  return [
    {
      id: "operation_project",
      label: "운영 폴더 설정",
      done: Boolean(project.title && project.villageName && project.periodLabel),
      helper: "로컬페이지, 운영 기간, 담당자 정보가 필요합니다.",
    },
    {
      id: "budget_config",
      label: "예산 구조",
      done: project.budgetCategories.length > 0 && summary.totalBudget > 0,
      helper: `${project.budgetCategories.length}개 예산 항목, 총 ${formatCurrency(summary.totalBudget)} 설정`,
    },
    {
      id: "expense_event",
      label: "지출 이벤트",
      done: project.expenseEvents.length > 0,
      helper: `${project.expenseEvents.length}건, ${formatCurrency(summary.usedAmount)} 집행 기록`,
    },
    {
      id: "evidence_item",
      label: "증빙 수집",
      done: summary.missingEvidenceCount === 0 && summary.requiredEvidenceCount > 0,
      helper:
        summary.requiredEvidenceCount === 0
          ? "지출 유형별 증빙 규칙을 먼저 설정하세요."
          : `${summary.completedEvidenceCount}/${summary.requiredEvidenceCount}개 수집`,
    },
    {
      id: "activity_event",
      label: "활동/참석 기록",
      done: project.activityEvents.length > 0,
      helper: `${project.activityEvents.length}개 활동, ${summary.participantCount}명 기록`,
    },
    {
      id: "report_manual_input",
      label: "보고 수동 입력",
      done: summary.manualMissingCount === 0,
      helper:
        summary.manualMissingCount === 0
          ? "필수 서술 필드가 채워졌습니다."
          : `${summary.manualMissingCount}개 필수 필드가 비어 있습니다.`,
    },
  ];
}

export function buildGeneratedReportSections(
  project: ReportProject,
  applications: HostApplication[] = [],
): GeneratedReportSection[] {
  const summary = summarizeReportProject(project, applications);
  const applicationSummary = summarizeApplications(getReportApplications(project, applications));
  const missingChecklist = buildReportChecklist(project, applications).filter(
    (item) => !item.done,
  );
  const sectionMap: Record<ReportSectionId, GeneratedReportSection> = {
    activities: {
      id: "activities",
      title: reportSectionLabels.activities,
      body: `${project.activityEvents.length}개 활동에서 ${summary.participantCount}명의 참석 기록과 사진 ${project.activityEvents.reduce((sum, activity) => sum + activity.photosCount, 0)}장을 보고 자료로 연결했습니다. 신청자 DB 기준 완료 상태는 ${applicationSummary.completed}명입니다.`,
    },
    budget: {
      id: "budget",
      title: reportSectionLabels.budget,
      body: `총 예산 ${formatCurrency(summary.totalBudget)} 중 ${formatCurrency(summary.usedAmount)}을 집행했습니다. 현재 집행률은 ${summary.budgetUsageRate}%이며 초과 금액은 ${formatCurrency(summary.overBudgetAmount)}입니다.`,
    },
    evidence: {
      id: "evidence",
      title: reportSectionLabels.evidence,
      body: `지출 유형별 증빙 ${summary.requiredEvidenceCount}개 중 ${summary.completedEvidenceCount}개가 수집됐고 ${summary.missingEvidenceCount}개가 남았습니다. 증빙 규칙은 호스트가 직접 설정한 항목을 기준으로 판단합니다.`,
    },
    expenses: {
      id: "expenses",
      title: reportSectionLabels.expenses,
      body: `${project.expenseEvents.length}건의 지출 이벤트가 등록됐습니다. 각 지출은 예산 항목, 지급처, 결제수단, 관련 활동, 증빙 체크리스트와 연결됩니다.`,
    },
    nextActions: {
      id: "nextActions",
      title: reportSectionLabels.nextActions,
      body:
        missingChecklist.length > 0
          ? `다음 조치는 ${missingChecklist.map((item) => item.label).join(", ")} 보완입니다.`
          : "필수 운영 데이터가 채워졌습니다. 제출 전 검토자 확인과 산출물 내보내기를 진행할 수 있습니다.",
    },
    overview: {
      id: "overview",
      title: reportSectionLabels.overview,
      body: `${project.title}는 ${project.periodLabel} 동안 ${project.villageName}이 운영하는 로컬페이지 폴더입니다. 공개 프로그램과 활동, 지출, 증빙을 한 곳에 모아 마감 준비율 ${summary.readiness}% 상태로 관리합니다.`,
    },
    risks: {
      id: "risks",
      title: reportSectionLabels.risks,
      body:
        summary.overBudgetAmount > 0 || summary.missingEvidenceCount > 0
          ? `주의 항목이 있습니다. 예산 초과 ${formatCurrency(summary.overBudgetAmount)}, 미수집 증빙 ${summary.missingEvidenceCount}개입니다.`
          : "예산 초과와 필수 증빙 누락 리스크가 현재 없습니다.",
    },
  };

  return project.sections.map((sectionId) => sectionMap[sectionId]);
}

export function buildReportMarkdown(
  project: ReportProject,
  applications: HostApplication[] = [],
): string {
  const summary = summarizeReportProject(project, applications);
  const sections = buildGeneratedReportSections(project, applications);
  const checklist = buildReportChecklist(project, applications);

  return [
    `# ${project.title}`,
    "",
    `- 로컬페이지: ${project.villageName}`,
    `- 운영 조직: ${project.agencyName}`,
    `- 연결 프로그램: ${project.connectedProgramTitles.join(", ") || "전체 프로그램"}`,
    `- 운영 기간: ${project.periodLabel}`,
    `- 담당자: ${project.ownerName}`,
    `- 마감 준비율: ${summary.readiness}%`,
    "",
    "## 제출 준비 체크리스트",
    ...checklist.map(
      (item) => `- [${item.done ? "x" : " "}] ${item.label}: ${item.helper}`,
    ),
    "",
    "## 지출 이벤트",
    ...project.expenseEvents.map(
      (expense) =>
        `- ${expense.spentAt} / ${expense.title} / ${formatCurrency(expense.amount)} / ${expense.vendor || "지급처 미입력"}`,
    ),
    "",
    "## 활동 이벤트",
    ...project.activityEvents.map(
      (activity) =>
        `- ${activity.activityAt} / ${activity.title} / ${activity.place || "장소 미입력"} / 참석 ${activity.participantCount}명`,
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
  applications: HostApplication[] = [],
): string {
  const scopedApplications = getReportApplications(project, applications);

  return JSON.stringify(
    {
      applications: scopedApplications,
      checklist: buildReportChecklist(project, applications),
      project,
      sections: buildGeneratedReportSections(project, applications),
      summary: summarizeReportProject(project, applications),
    },
    null,
    2,
  );
}

export function normalizeReportProjectModel(input: unknown): ReportProject {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return createReportProject();
  }

  const value = input as Record<string, unknown>;
  const programId = asString(value.programId);
  const connectedProgramIds = normalizeStringArray(value.connectedProgramIds);
  const connectedProgramTitles = normalizeStringArray(value.connectedProgramTitles);
  const legacyProgramTitle = asString(value.programTitle);
  const id = asString(value.id) || `operation-${Date.now()}`;
  const normalizedConnectedProgramTitles =
    connectedProgramTitles.length > 0
      ? connectedProgramTitles
      : legacyProgramTitle && legacyProgramTitle !== "전체 프로그램"
        ? [legacyProgramTitle]
        : [];
  const migratedConnectedProgramTitles =
    id === "operation-boseong-2026"
      ? Array.from(
          new Set([
            ...normalizedConnectedProgramTitles,
            "나를 담는 차 실험실",
            "로컬살롱",
          ]),
        )
      : normalizedConnectedProgramTitles;
  const normalizedConnectedProgramIds = Array.from(
    new Set([programId, ...connectedProgramIds].filter(Boolean)),
  );

  return {
    activityEvents: normalizeActivityEvents(value.activityEvents),
    agencyName: asString(value.agencyName) || "운영 조직명",
    budgetCategories: normalizeBudgetCategories(value.budgetCategories),
    connectedProgramIds: normalizedConnectedProgramIds,
    connectedProgramTitles: migratedConnectedProgramTitles,
    evidenceRules: normalizeEvidenceRules(value.evidenceRules),
    expenseEvents: normalizeExpenseEvents(value.expenseEvents),
    id,
    imageUrl: asString(value.imageUrl),
    manualFields: normalizeManualFields(value.manualFields),
    ownerName: asString(value.ownerName) || "담당자명",
    periodLabel: asString(value.periodLabel) || "운영 기간 입력",
    programTitle: legacyProgramTitle || "전체 프로그램",
    programId,
    sections: normalizeSections(value.sections),
    status: asReportStatus(value.status),
    title: asString(value.title) || asString(value.name) || "운영 폴더",
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    villageId: asString(value.villageId),
    villageName:
      asString(value.villageName) ||
      asString(value.organizationName) ||
      "로컬페이지",
    villageSlug: asString(value.villageSlug),
  };
}

export function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function normalizeBudgetCategories(value: unknown): BudgetCategory[] {
  const items = asArray(value)
    .map((item) => {
      const record = asRecord(item);
      if (!record) return undefined;
      return {
        id: asString(record.id) || `budget-${Date.now()}`,
        label: asString(record.label) || "예산 항목",
        parentLabel: asString(record.parentLabel) || "운영비",
        plannedAmount: asNumber(record.plannedAmount),
      };
    })
    .filter(Boolean) as BudgetCategory[];

  return items.length > 0 ? items : defaultBudgetCategories;
}

function normalizeEvidenceRules(value: unknown): EvidenceRule[] {
  const items = asArray(value)
    .map((item) => {
      const record = asRecord(item);
      if (!record) return undefined;
      const type = asString(record.type);
      return {
        categoryId: asString(record.categoryId) || "all",
        id: asString(record.id) || `evidence-${Date.now()}`,
        label: asString(record.label) || "증빙 항목",
        required: asBoolean(record.required, true),
        type: type === "check" || type === "text" ? type : "file",
      };
    })
    .filter(Boolean) as EvidenceRule[];

  return items.length > 0 ? items : defaultEvidenceRules;
}

function normalizeExpenseEvents(value: unknown): ExpenseEvent[] {
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      if (!record) return undefined;
      const paymentMethod = asString(record.paymentMethod);
      return {
        amount: asNumber(record.amount),
        categoryId: asString(record.categoryId) || "all",
        evidenceItems: normalizeEvidenceItems(record.evidenceItems),
        id: asString(record.id) || `expense-${Date.now()}`,
        linkedActivityId: asString(record.linkedActivityId),
        memo: asString(record.memo),
        paymentMethod:
          paymentMethod === "transfer" ||
          paymentMethod === "cash" ||
          paymentMethod === "other"
            ? paymentMethod
            : "card",
        spentAt: asString(record.spentAt) || new Date().toISOString().slice(0, 10),
        title: asString(record.title) || "지출",
        vendor: asString(record.vendor),
      };
    })
    .filter(Boolean) as ExpenseEvent[];
}

function normalizeEvidenceItems(value: unknown): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const item of asArray(value)) {
    const record = asRecord(item);
    if (!record) continue;

    const ruleId = asString(record.ruleId) || asString(record.id);
    if (!ruleId) continue;

    items.push({
      fileName: asString(record.fileName),
      label: asString(record.label) || "증빙 항목",
      note: asString(record.note),
      ruleId,
      status: asEvidenceStatus(record.status),
    });
  }

  return items;
}

function normalizeActivityEvents(value: unknown): ActivityEvent[] {
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      if (!record) return undefined;
      return {
        activityAt:
          asString(record.activityAt) || new Date().toISOString().slice(0, 10),
        description: asString(record.description),
        id: asString(record.id) || `activity-${Date.now()}`,
        participantCount: asNumber(record.participantCount),
        photosCount: asNumber(record.photosCount),
        place: asString(record.place),
        relatedProgramTitle:
          asString(record.relatedProgramTitle) || "전체 프로그램",
        title: asString(record.title) || "활동",
      };
    })
    .filter(Boolean) as ActivityEvent[];
}

function normalizeManualFields(value: unknown): ReportManualField[] {
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      if (!record) return undefined;
      return {
        fieldType: asOperationFieldType(record.fieldType),
        group: asOperationFieldGroup(record.group),
        id: asString(record.id) || `manual-${Date.now()}`,
        label: asString(record.label) || "보고 필드",
        required: asBoolean(record.required, false),
        value: asString(record.value),
      };
    })
    .filter(Boolean) as ReportManualField[];
}

function normalizeSections(value: unknown): ReportSectionId[] {
  if (!Array.isArray(value)) return reportSectionOrder;

  const selectedSections = value.filter((item): item is ReportSectionId =>
    reportSectionOrder.includes(item as ReportSectionId),
  );

  return selectedSections.length > 0
    ? reportSectionOrder.filter((sectionId) => selectedSections.includes(sectionId))
    : reportSectionOrder;
}

function asReportStatus(value: unknown): ReportProjectStatus {
  const text = asString(value);
  return reportStatusValues.includes(text as ReportProjectStatus)
    ? (text as ReportProjectStatus)
    : "draft";
}

function asEvidenceStatus(value: unknown): EvidenceItemStatus {
  const text = asString(value);
  if (text === "approved" || text === "submitted") return text;
  return "missing";
}

function asOperationFieldGroup(value: unknown): OperationFieldGroup {
  const text = asString(value);
  return operationFieldGroups.includes(text as OperationFieldGroup)
    ? (text as OperationFieldGroup)
    : "report_manual_input";
}

function asOperationFieldType(value: unknown): OperationFieldType {
  const text = asString(value);
  return operationFieldTypes.includes(text as OperationFieldType)
    ? (text as OperationFieldType)
    : "text";
}

function normalizeStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => asString(item))
    .filter(Boolean);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const reportStatusValues: ReportProjectStatus[] = ["draft", "review", "ready"];
const operationFieldGroups: OperationFieldGroup[] = [
  "organization_profile",
  "operation_project",
  "budget_config",
  "expense_event",
  "evidence_item",
  "activity_event",
  "report_manual_input",
];
const operationFieldTypes: OperationFieldType[] = [
  "checkbox",
  "date",
  "file",
  "number",
  "text",
];
