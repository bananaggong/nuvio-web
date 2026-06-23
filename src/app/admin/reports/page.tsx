import type { Metadata } from "next";
import { AdminReportReview } from "@/components/admin-report-review";

export const metadata: Metadata = {
  title: "운영 폴더 검토 | 누비오 관리자",
  description:
    "누비오 관리자가 채널별 운영 폴더의 증빙 누락, 예산 리스크, 마감 준비율을 검토하는 화면입니다.",
};

export default function AdminReportsPage() {
  return <AdminReportReview />;
}
