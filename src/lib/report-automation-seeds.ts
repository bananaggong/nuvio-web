import "server-only";

import { isDemoModeEnabled } from "@/lib/demo-mode";
import {
  defaultBudgetCategories,
  defaultEvidenceRules,
  reportSectionOrder,
  type ReportProject,
} from "@/lib/report-automation";

export const seedReportProjects: ReportProject[] = [
  {
    id: "operation-boseong-2026",
    title: "보성 채널 2026 운영 폴더",
    villageId: "33333333-4444-4555-8666-777777777777",
    villageName: "전체차LAB",
    villageSlug: "boseong",
    agencyName: "보성 채널 운영팀",
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
        description: "다음 모집에 사용할 채널 대표 이미지와 숏폼을 제작했습니다.",
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
