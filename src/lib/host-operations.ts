export type HostApplicationStatus =
  | "submitted"
  | "screening"
  | "accepted"
  | "rejected"
  | "checkedIn"
  | "completed";

export type HostApplication = {
  id: string;
  answers?: Record<string, unknown>;
  consentSnapshot?: Record<string, unknown>;
  formId?: string;
  formSnapshot?: Record<string, unknown>;
  programId?: string;
  programCreatedBy?: string;
  programRunId?: string;
  programRunTitle?: string;
  programTitle: string;
  villageId?: string;
  applicantName: string;
  email: string;
  phone: string;
  status: HostApplicationStatus;
  submittedAt: string;
  paymentAmount: number;
  receiptCount: number;
  signatureCompleted: boolean;
  reviewSubmitted: boolean;
  memo: string;
};

export type MessageTemplate = {
  id: string;
  name: string;
  trigger: string;
  body: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  helper: string;
};

export const applicationStatusFlow: HostApplicationStatus[] = [
  "submitted",
  "screening",
  "accepted",
  "checkedIn",
  "completed",
];

export const applicationStatusLabels: Record<HostApplicationStatus, string> = {
  submitted: "접수",
  screening: "검토",
  accepted: "승인",
  rejected: "거절",
  checkedIn: "참여 중",
  completed: "완료",
};

export function summarizeApplications(applications: HostApplication[]) {
  const accepted = applications.filter((item) => item.status === "accepted").length;
  const checkedIn = applications.filter((item) => item.status === "checkedIn").length;
  const completed = applications.filter((item) => item.status === "completed").length;
  const paidAmount = applications.reduce((sum, item) => sum + item.paymentAmount, 0);
  const signatureCount = applications.filter((item) => item.signatureCompleted).length;
  const reviewCount = applications.filter((item) => item.reviewSubmitted).length;
  const receiptCount = applications.reduce((sum, item) => sum + item.receiptCount, 0);

  return {
    total: applications.length,
    accepted,
    checkedIn,
    completed,
    paidAmount,
    signatureCount,
    reviewCount,
    receiptCount,
    reportReadiness: calculateReportReadiness(applications),
  };
}

export function buildReportMetrics(applications: HostApplication[]): ReportMetric[] {
  const summary = summarizeApplications(applications);

  return [
    {
      label: "신청자",
      value: `${summary.total}명`,
      helper: "접수 DB 기준",
    },
    {
      label: "확정/참여",
      value: `${summary.accepted + summary.checkedIn + summary.completed}명`,
      helper: "승인 이후 상태",
    },
    {
      label: "수납 금액",
      value: `${summary.paidAmount.toLocaleString("ko-KR")}원`,
      helper: "계좌이체/결제 입력값",
    },
    {
      label: "보고 준비율",
      value: `${summary.reportReadiness}%`,
      helper: "서명, 증빙 충족률",
    },
  ];
}

export function buildHostReportCsv(applications: HostApplication[]): string {
  const header = [
    "프로그램",
    "신청자",
    "이메일",
    "연락처",
    "상태",
    "결제금액",
    "영수증수",
    "서명",
    "리뷰",
    "메모",
  ];
  const rows = applications.map((item) => [
    item.programTitle,
    item.applicantName,
    item.email,
    item.phone,
    applicationStatusLabels[item.status],
    String(item.paymentAmount),
    String(item.receiptCount),
    item.signatureCompleted ? "완료" : "미완료",
    item.reviewSubmitted ? "완료" : "미완료",
    item.memo,
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function calculateReportReadiness(applications: HostApplication[]): number {
  if (applications.length === 0) return 0;

  const maxScore = applications.length * 3;
  const score = applications.reduce((sum, item) => {
    return (
      sum +
      (item.signatureCompleted ? 1 : 0) +
      (item.receiptCount > 0 ? 1 : 0) +
      (item.reviewSubmitted ? 1 : 0)
    );
  }, 0);

  return Math.round((score / maxScore) * 100);
}

function escapeCsvValue(value: string): string {
  if (!/[",\n]/u.test(value)) return value;
  return `"${value.replace(/"/gu, '""')}"`;
}

export function mergeHostApplications(
  baseApplications: HostApplication[],
  overrideApplications: HostApplication[],
): HostApplication[] {
  const applicationMap = new Map<string, HostApplication>();
  baseApplications.forEach((application) => {
    applicationMap.set(application.id, application);
  });
  overrideApplications.forEach((application) => {
    applicationMap.set(application.id, application);
  });
  return [...applicationMap.values()].sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
  );
}
