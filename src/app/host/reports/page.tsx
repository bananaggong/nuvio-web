import type { Metadata } from "next";
import { HostReportAutomation } from "@/components/host-report-automation";

export const metadata: Metadata = {
  title: "보고 자동화 센터",
  description:
    "누비오 호스트가 신청, 정산, 증빙, 후기 데이터를 제출용 결과보고서 초안으로 변환하는 화면입니다.",
};

export default function HostReportsPage() {
  return <HostReportAutomation />;
}
