import type { Metadata } from "next";
import { AdminReportReview } from "@/components/admin-report-review";

export const metadata: Metadata = {
  title: "운영 프로젝트 검토 | NUVIO Admin",
  description:
    "NUVIO 관리자가 로컬홈별 운영 프로젝트의 증빙 누락, 예산 리스크, 마감 준비율을 검토하는 화면입니다.",
};

export default function AdminReportsPage() {
  return <AdminReportReview />;
}
