export type HostApplicationStatus =
  | "submitted"
  | "screening"
  | "accepted"
  | "rejected"
  | "checkedIn"
  | "completed";

export type HostApplication = {
  id: string;
  programTitle: string;
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

export const HOST_APPLICATION_STORAGE_KEY = "nuvio:host-applications";

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
  accepted: "합격",
  rejected: "불합격",
  checkedIn: "참여중",
  completed: "완료",
};

export const seedHostApplications: HostApplication[] = [
  {
    id: "app-001",
    programTitle: "강릉 파도 워케이션 6월",
    applicantName: "김서연",
    email: "seoyeon@example.com",
    phone: "010-4421-9031",
    status: "accepted",
    submittedAt: "2026-05-03T09:20:00+09:00",
    paymentAmount: 50000,
    receiptCount: 3,
    signatureCompleted: true,
    reviewSubmitted: false,
    memo: "원격근무 가능 여부 확인 완료",
  },
  {
    id: "app-002",
    programTitle: "강릉 파도 워케이션 6월",
    applicantName: "박민준",
    email: "minjun@example.com",
    phone: "010-1384-7220",
    status: "screening",
    submittedAt: "2026-05-03T13:05:00+09:00",
    paymentAmount: 0,
    receiptCount: 0,
    signatureCompleted: false,
    reviewSubmitted: false,
    memo: "자기소개 답변 보강 필요",
  },
  {
    id: "app-003",
    programTitle: "남해 섬마을 한달살기",
    applicantName: "이하늘",
    email: "haneul@example.com",
    phone: "010-7742-1188",
    status: "checkedIn",
    submittedAt: "2026-05-02T17:42:00+09:00",
    paymentAmount: 280000,
    receiptCount: 8,
    signatureCompleted: true,
    reviewSubmitted: false,
    memo: "숙소 배정 완료, 1차 영수증 수집 중",
  },
  {
    id: "app-004",
    programTitle: "제천 반값여행 페이백 2차",
    applicantName: "정유진",
    email: "yujin@example.com",
    phone: "010-2190-5366",
    status: "completed",
    submittedAt: "2026-05-01T11:12:00+09:00",
    paymentAmount: 120000,
    receiptCount: 5,
    signatureCompleted: true,
    reviewSubmitted: true,
    memo: "환급 서류와 후기 모두 완료",
  },
  {
    id: "app-005",
    programTitle: "고흥 별빛 귀촌 2주 프로젝트",
    applicantName: "최도윤",
    email: "doyun@example.com",
    phone: "010-8841-6120",
    status: "submitted",
    submittedAt: "2026-05-04T08:10:00+09:00",
    paymentAmount: 0,
    receiptCount: 0,
    signatureCompleted: false,
    reviewSubmitted: false,
    memo: "가족 동반 여부 확인 필요",
  },
];

export const seedMessageTemplates: MessageTemplate[] = [
  {
    id: "msg-accepted",
    name: "합격 안내",
    trigger: "합격 처리 직후",
    body: "{name}님, {program} 참여자로 선정되었습니다. 결제와 사전 서명을 오늘 안에 완료해주세요.",
  },
  {
    id: "msg-reminder",
    name: "참여 전 리마인더",
    trigger: "시작 2일 전",
    body: "{name}님, {program} 시작 전 준비물과 집결 장소를 확인해주세요. 영수증은 누비오에 저장하면 됩니다.",
  },
  {
    id: "msg-review",
    name: "리뷰 요청",
    trigger: "종료 다음 날",
    body: "{name}님, 참여 후기는 지원 조건 확인과 다음 모집 홍보에 활용됩니다. 오늘 안에 리뷰를 남겨주세요.",
  },
];

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
      label: "선정/참여",
      value: `${summary.accepted + summary.checkedIn + summary.completed}명`,
      helper: "합격 이후 상태",
    },
    {
      label: "수납 금액",
      value: `${summary.paidAmount.toLocaleString("ko-KR")}원`,
      helper: "계좌이체/결제 입력값",
    },
    {
      label: "보고 준비율",
      value: `${summary.reportReadiness}%`,
      helper: "서명, 증빙, 후기 충족률",
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

export function readHostApplicationsFromStorage(): HostApplication[] {
  if (typeof window === "undefined") return seedHostApplications;

  try {
    const rawValue = window.localStorage.getItem(HOST_APPLICATION_STORAGE_KEY);
    if (!rawValue) return seedHostApplications;

    const storedApplications = JSON.parse(rawValue) as HostApplication[];
    return mergeHostApplications(seedHostApplications, storedApplications);
  } catch {
    return seedHostApplications;
  }
}

export function writeHostApplicationsToStorage(applications: HostApplication[]) {
  window.localStorage.setItem(
    HOST_APPLICATION_STORAGE_KEY,
    JSON.stringify(applications),
  );
}

export function appendHostApplication(application: HostApplication): HostApplication[] {
  const applications = readHostApplicationsFromStorage();
  const next = mergeHostApplications(applications, [application]);
  writeHostApplicationsToStorage(next);
  return next;
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

function mergeHostApplications(
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
